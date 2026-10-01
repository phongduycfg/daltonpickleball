import type { PayStatus } from '@/types/database';
import type { LedgerItem, Member } from '@/types/app';
import type { SettlementResult } from './settlement';
import { paymentLabel, type PayTone } from './settlement';
import type { PeriodSnapshot } from './snapshot';

/**
 * Dữ liệu hiển thị màn Thanh toán — dùng chung cho kỳ đang mở (tính trực tiếp)
 * và kỳ đã đóng (đọc từ snapshot). Hàm thuần, chạy ở server.
 */
export interface PayRowView {
  memberId: string;
  name: string;
  sessions: number;
  losses: number;
  burden: number;
  advanced: number;
  net: number;
  isAccountant: boolean;
  status: PayStatus;
  label: string;
  tone: PayTone;
}

export interface PayItemView {
  id: string | null;
  kind: 'expense' | 'income';
  description: string;
  amount: number;
  memberName: string;
  memberId: string | null;
}

export interface PaymentsView {
  plan: 1 | 2;
  fixedRate: number;
  totalCost: number;
  sessionCount: number;
  totalLosses: number;
  unitPrice: number;
  memberCount: number;
  rows: PayRowView[];
  items: PayItemView[];
}

/** Ai có tham gia hoặc có phát sinh tiền mới hiện trong bảng; xếp theo trận thua giảm dần */
const relevant = (r: { sessions: number; net: number; isAccountant: boolean }) => r.sessions > 0 || r.net !== 0 || r.isAccountant;
const order = (a: PayRowView, b: PayRowView) => b.losses - a.losses || b.burden - a.burden || a.name.localeCompare(b.name, 'vi');

export function viewFromSettlement(args: {
  result: SettlementResult;
  plan: 1 | 2;
  fixedRate: number;
  payments: Record<string, PayStatus>;
  ledger: LedgerItem[];
  members: Member[];
}): PaymentsView {
  const { result, payments, members } = args;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'Thành viên cũ';
  const rows = result.rows
    .filter(relevant)
    .map((r) => {
      const status = payments[r.memberId] ?? 'none';
      const l = paymentLabel(r, status);
      return { ...r, status, label: l.label, tone: l.tone };
    })
    .sort(order);
  return {
    plan: args.plan,
    fixedRate: args.fixedRate,
    totalCost: result.totalCost,
    sessionCount: result.sessionCount,
    totalLosses: result.totalLosses,
    unitPrice: result.unitPrice,
    memberCount: rows.length,
    rows,
    items: args.ledger.map((i) => ({ id: i.id, kind: i.kind, description: i.description, amount: i.amount, memberId: i.memberId, memberName: nameOf(i.memberId) })),
  };
}

export function viewFromSnapshot(s: PeriodSnapshot): PaymentsView {
  const rows = s.rows
    .filter(relevant)
    .map((r) => ({ ...r, status: r.payStatus, label: r.statusLabel, tone: paymentLabel(r, r.payStatus).tone }))
    .sort(order);
  return {
    plan: s.plan,
    fixedRate: s.fixedRate,
    totalCost: s.totalCost,
    sessionCount: s.sessionCount,
    totalLosses: s.totalLosses,
    unitPrice: s.unitPrice,
    memberCount: rows.length,
    rows,
    items: s.items.map((i) => ({ ...i, id: null, memberId: null })),
  };
}
