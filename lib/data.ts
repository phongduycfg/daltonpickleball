import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AppRole, LedgerKind, MemberStatus, PayStatus, SessionStatus } from '@/types/database';
import type { ClubSettings, CurrentMember, LedgerItem, Member, Period, Session, Venue } from '@/types/app';
import { createClient } from '@/lib/supabase/server';
import { computeFund, computeSettlement, type FundSummary, type SettlementResult } from '@/lib/settlement';
import { buildSnapshot, parseSnapshot, type PeriodSnapshot } from '@/lib/snapshot';
import { hhmm } from '@/lib/dates';

/**
 * Lớp dữ liệu cho Server Components / Server Actions.
 *
 * Toàn bộ dữ liệu 1 màn hình lấy bằng ĐÚNG 1 lần gọi RPC `app_snapshot()` (Postgres tự gom JSON),
 * thay vì nhiều truy vấn nối tiếp → giảm độ trễ mạng. RPC chạy với quyền người dùng nên RLS vẫn áp dụng.
 * Kết quả được cache trong phạm vi 1 request (layout + page dùng chung).
 */

/** Dạng JSON do app_snapshot() trả về (khớp migration 20261002010000_performance.sql) */
interface RawSnapshot {
  me: { id: string; email: string; display_name: string; avatar_url: string | null; role: AppRole; status: MemberStatus; skill: number } | null;
  settings: {
    club_name: string;
    fixed_rate: number;
    min_sessions: number;
    bank_bin: string | null;
    bank_account_no: string | null;
    bank_owner: string | null;
    transfer_syntax: string;
  } | null;
  members: { id: string; email: string; display_name: string; avatar_url: string | null; role: AppRole; skill: number }[];
  venues: { id: string; name: string; area: string; default_cost: number; is_active: boolean }[];
  periods: { id: string; seq: number; start_date: string; end_date: string | null; plan: number; fixed_rate: number; closed_at: string | null; has_snapshot: boolean }[];
  sessions: {
    id: string;
    period_id: string;
    venue_id: string;
    play_date: string;
    start_time: string;
    end_time: string;
    cost: number;
    status: SessionStatus;
    seq: number | null;
    started_at: string | null;
    results: { member_id: string; losses: number }[];
  }[];
  ledger: { id: string; kind: LedgerKind; description: string; amount: number; member_id: string }[];
  excluded: string[];
  payments: Record<string, PayStatus>;
}

export type PeriodListItem = Period & { hasSnapshot: boolean };

export interface PeriodData {
  sessions: Session[];
  ledger: LedgerItem[];
  excluded: string[];
  payments: Record<string, PayStatus>;
}

/** Kết quả đọc dữ liệu: thành viên chưa duyệt chỉ có thông tin của chính mình */
export type ClubState =
  | { active: false; me: CurrentMember }
  | {
      active: true;
      me: CurrentMember;
      settings: ClubSettings;
      members: Member[];
      venues: Venue[];
      periods: PeriodListItem[];
      period: PeriodListItem;
      data: PeriodData;
    };

/** Đọc & chuẩn hoá dữ liệu CLB (1 round-trip). me = null nếu chưa đăng nhập. */
export const loadClub = cache(async (): Promise<ClubState | null> => {
  const supabase = await createClient();
  const { data: json, error } = await supabase.rpc('app_snapshot');
  // Chưa đăng nhập / phiên hết hạn → PostgREST từ chối quyền execute
  if (error?.code === '42501' || error?.code === 'PGRST301') return null;
  if (error) throw error;
  const raw = json as unknown as RawSnapshot;
  if (!raw.me) return null;

  const me: CurrentMember = {
    id: raw.me.id,
    email: raw.me.email,
    name: raw.me.display_name,
    avatarUrl: raw.me.avatar_url,
    role: raw.me.role,
    skill: raw.me.skill,
    status: raw.me.status,
  };
  if (me.status !== 'active') return { active: false, me };
  if (!raw.settings) throw new Error('Thiếu cấu hình CLB — hãy chạy supabase/seed.sql');

  const settings: ClubSettings = {
    clubName: raw.settings.club_name,
    fixedRate: raw.settings.fixed_rate,
    minSessions: raw.settings.min_sessions,
    bankBin: raw.settings.bank_bin,
    bankAccountNo: raw.settings.bank_account_no,
    bankOwner: raw.settings.bank_owner,
    transferSyntax: raw.settings.transfer_syntax,
  };
  const members: Member[] = raw.members
    .map((p) => ({ id: p.id, email: p.email, name: p.display_name, avatarUrl: p.avatar_url, role: p.role, skill: p.skill }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const venues: Venue[] = raw.venues.map((v) => ({ id: v.id, name: v.name, area: v.area, defaultCost: v.default_cost, isActive: v.is_active }));
  const periods: PeriodListItem[] = raw.periods.map((p) => ({
    id: p.id,
    seq: p.seq,
    startDate: p.start_date,
    endDate: p.end_date,
    plan: p.plan === 2 ? 2 : 1,
    fixedRate: p.fixed_rate,
    closedAt: p.closed_at,
    hasSnapshot: p.has_snapshot,
  }));
  const period = periods.find((p) => !p.closedAt);
  if (!period) throw new Error('Không có kỳ đang mở — hãy chạy supabase/seed.sql');

  const data: PeriodData = {
    sessions: raw.sessions.map((s) => ({
      id: s.id,
      periodId: s.period_id,
      venueId: s.venue_id,
      date: s.play_date,
      start: hhmm(s.start_time),
      end: hhmm(s.end_time),
      cost: s.cost,
      status: s.status,
      seq: s.seq,
      startedAt: s.started_at,
      results: s.results.map((r) => ({ memberId: r.member_id, losses: r.losses })),
    })),
    ledger: raw.ledger.map((i) => ({ id: i.id, kind: i.kind, description: i.description, amount: i.amount, memberId: i.member_id })),
    excluded: raw.excluded,
    payments: raw.payments,
  };

  return { active: true, me, settings, members, venues, periods, period, data };
});

/** Tính tiền cho kỳ đang mở */
export function settleOpenPeriod(args: { period: Period; data: PeriodData; members: Member[] }): {
  result: SettlementResult;
  fund: FundSummary;
  accountantId: string | null;
} {
  const { period, data, members } = args;
  const accountantId = members.find((m) => m.role === 'accountant')?.id ?? members.find((m) => m.role === 'admin')?.id ?? null;
  const result = computeSettlement({
    members: members.map((m) => ({ id: m.id, name: m.name })),
    sessions: data.sessions.filter((s) => s.status !== 'scheduled'),
    ledger: data.ledger,
    plan: period.plan,
    fixedRate: period.fixedRate,
    excluded: data.excluded,
    accountantId,
  });
  return { result, fund: computeFund(result, data.payments), accountantId };
}

/** Snapshot của kỳ đang mở — dùng khi đóng kỳ và khi xuất báo cáo PDF kỳ hiện tại */
export function snapshotOfPeriod(args: { period: Period; data: PeriodData; members: Member[]; settings: ClubSettings; result: SettlementResult }): PeriodSnapshot {
  const { period, data, members, settings, result } = args;
  const played = data.sessions.filter((s) => s.status !== 'scheduled');
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '—';
  return buildSnapshot({
    result,
    plan: period.plan,
    fixedRate: period.fixedRate,
    payments: data.payments,
    items: data.ledger.map((i) => ({ kind: i.kind, description: i.description, amount: i.amount, memberName: nameOf(i.memberId) })),
    bank: { bin: settings.bankBin, accountNo: settings.bankAccountNo, owner: settings.bankOwner, syntax: settings.transferSyntax },
    firstDate: played[0]?.date ?? null,
    lastDate: played.at(-1)?.date ?? null,
  });
}

/**
 * Ngữ cảnh dùng chung cho nhóm màn hình (app): bắt buộc là thành viên đã duyệt.
 * Cache theo request → layout và page gọi lại không tốn thêm truy vấn.
 */
export const getAppContext = cache(async () => {
  const club = await loadClub();
  if (!club) redirect('/login');
  if (!club.active) redirect('/pending');
  const { me, settings, members, venues, periods, period, data } = club;
  const { result, fund, accountantId } = settleOpenPeriod({ period, data, members });
  return { me, settings, members, venues, periods, period, data, result, fund, accountantId };
});

export type AppContext = Awaited<ReturnType<typeof getAppContext>>;

/** Snapshot đã chốt của 1 kỳ cũ (chỉ tải khi người dùng chọn xem kỳ đó) */
export const getArchivedSnapshot = cache(async (periodId: string): Promise<PeriodSnapshot | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('periods').select('snapshot').eq('id', periodId).not('closed_at', 'is', null).maybeSingle();
  if (error) throw error;
  return data ? parseSnapshot(data.snapshot) : null;
});

/** Đăng ký đang chờ duyệt (chỉ Quản trị viên đọc được) */
export const getPendingMembers = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, email: p.email, name: p.display_name, avatarUrl: p.avatar_url, createdAt: p.created_at }));
});
