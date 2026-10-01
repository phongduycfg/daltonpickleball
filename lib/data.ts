import 'server-only';
import { cache } from 'react';
import type { PayStatus } from '@/types/database';
import type { ClubSettings, LedgerItem, Member, Period, Session, Venue } from '@/types/app';
import { createClient } from '@/lib/supabase/server';
import { computeFund, computeSettlement, type FundSummary, type SettlementResult } from '@/lib/settlement';
import { buildSnapshot, parseSnapshot, type PeriodSnapshot } from '@/lib/snapshot';
import { hhmm } from '@/lib/dates';
import { requireMember } from '@/lib/auth';

/**
 * Lớp truy vấn dữ liệu cho Server Components.
 * Mọi hàm dùng client theo phiên người dùng (RLS áp dụng) và được cache trong 1 request.
 */

export const getClubSettings = cache(async (): Promise<ClubSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('club_settings').select('*').single();
  if (error || !data) throw error ?? new Error('Thiếu cấu hình CLB — hãy chạy supabase/seed.sql');
  return {
    clubName: data.club_name,
    fixedRate: data.fixed_rate,
    minSessions: data.min_sessions,
    bankBin: data.bank_bin,
    bankAccountNo: data.bank_account_no,
    bankOwner: data.bank_owner,
    transferSyntax: data.transfer_syntax,
  };
});

/** Thành viên đã duyệt, sắp theo tên tiếng Việt */
export const getMembers = cache(async (): Promise<Member[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, skill')
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? [])
    .map((p) => ({ id: p.id, email: p.email, name: p.display_name, avatarUrl: p.avatar_url, role: p.role, skill: p.skill }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
});

/** Đăng ký đang chờ duyệt (chỉ Quản trị viên dùng) */
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

export const getVenues = cache(async (): Promise<Venue[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('venues').select('*').order('sort_order').order('created_at');
  if (error) throw error;
  return (data ?? []).map((v) => ({ id: v.id, name: v.name, area: v.area, defaultCost: v.default_cost, isActive: v.is_active }));
});

/** Danh sách kỳ (mới nhất trước) cho ô chọn tháng */
export const getPeriods = cache(async (): Promise<(Period & { snapshot: PeriodSnapshot | null })[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('periods').select('*').order('year', { ascending: false }).order('month', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    year: p.year,
    month: p.month,
    plan: p.plan === 2 ? 2 : 1,
    fixedRate: p.fixed_rate,
    closedAt: p.closed_at,
    snapshot: p.closed_at ? parseSnapshot(p.snapshot) : null,
  }));
});

export const getOpenPeriod = cache(async () => {
  const periods = await getPeriods();
  const open = periods.find((p) => !p.closedAt);
  if (!open) throw new Error('Không có kỳ đang mở — hãy chạy supabase/seed.sql');
  return open;
});

/** Dữ liệu chi tiết 1 kỳ: buổi chơi + kết quả, thu/chi, loại trừ, thanh toán */
export const getPeriodData = cache(async (periodId: string) => {
  const supabase = await createClient();
  const [sessionsRes, ledgerRes, exclRes, payRes] = await Promise.all([
    supabase.from('sessions').select('*').eq('period_id', periodId).order('play_date').order('start_time'),
    supabase.from('ledger_items').select('*').eq('period_id', periodId).order('created_at'),
    supabase.from('period_exclusions').select('member_id').eq('period_id', periodId),
    supabase.from('payments').select('member_id, status').eq('period_id', periodId),
  ]);
  for (const r of [sessionsRes, ledgerRes, exclRes, payRes]) if (r.error) throw r.error;

  const rawSessions = sessionsRes.data ?? [];
  const ids = rawSessions.map((s) => s.id);
  const resultsRes = ids.length
    ? await supabase.from('session_results').select('session_id, member_id, losses').in('session_id', ids)
    : { data: [], error: null };
  if (resultsRes.error) throw resultsRes.error;

  const bySession = new Map<string, { memberId: string; losses: number }[]>();
  for (const r of resultsRes.data ?? []) {
    const list = bySession.get(r.session_id) ?? [];
    list.push({ memberId: r.member_id, losses: r.losses });
    bySession.set(r.session_id, list);
  }

  const sessions: Session[] = rawSessions.map((s) => ({
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
    results: bySession.get(s.id) ?? [],
  }));

  const ledger: LedgerItem[] = (ledgerRes.data ?? []).map((i) => ({
    id: i.id,
    kind: i.kind,
    description: i.description,
    amount: i.amount,
    memberId: i.member_id,
  }));

  const payments: Record<string, PayStatus> = {};
  for (const p of payRes.data ?? []) payments[p.member_id] = p.status;

  return { sessions, ledger, excluded: (exclRes.data ?? []).map((e) => e.member_id), payments };
});

export type PeriodData = Awaited<ReturnType<typeof getPeriodData>>;

/** Tính tiền cho kỳ đang mở */
export function settleOpenPeriod(args: {
  period: Period;
  data: PeriodData;
  members: Member[];
}): { result: SettlementResult; fund: FundSummary; accountantId: string | null } {
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
export function snapshotOfPeriod(args: {
  period: Period;
  data: PeriodData;
  members: Member[];
  settings: ClubSettings;
  result: SettlementResult;
}): PeriodSnapshot {
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
 * Toàn bộ ngữ cảnh dùng chung cho nhóm màn hình (app):
 * người dùng hiện tại, cấu hình CLB, thành viên, sân, kỳ đang mở và kết quả tính tiền.
 * Được cache theo request nên layout và page gọi lại không tốn thêm truy vấn.
 */
export const getAppContext = cache(async () => {
  const me = await requireMember();
  const [settings, members, venues, period] = await Promise.all([getClubSettings(), getMembers(), getVenues(), getOpenPeriod()]);
  const data = await getPeriodData(period.id);
  const { result, fund, accountantId } = settleOpenPeriod({ period, data, members });
  return { me, settings, members, venues, period, data, result, fund, accountantId };
});

export type AppContext = Awaited<ReturnType<typeof getAppContext>>;
