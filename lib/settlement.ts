import type { LedgerKind, PayStatus } from '@/types/database';

/**
 * CÔNG THỨC CHIA TIỀN (hàm thuần — dùng chung server/client, có unit test)
 *
 * Tổng chi phí = Σ(sân + nước các buổi đã chơi) + Σ khoản chi − Σ khoản thu
 * Phương án 1: Phải gánh = trận thua × (Tổng chi phí ÷ tổng trận thua)
 * Phương án 2: Phải gánh = trận thua × đơn giá cố định + phần hụt chia đều
 *              (phần hụt = Tổng chi phí − tổng trận thua × đơn giá; người bị loại trừ không chia)
 * Phải gánh làm tròn LÊN tới 1.000đ.
 * Đã ứng   = (Kế toán: toàn bộ sân + nước) + khoản chi đã ứng − khoản thu đang giữ
 * Net      = Phải gánh − Đã ứng  (dương: cần chuyển · âm: được nhận lại)
 */

export interface SettlementMember {
  id: string;
  name: string;
}

export interface SettlementSession {
  cost: number;
  results: { memberId: string; losses: number }[];
}

export interface SettlementLedgerItem {
  kind: LedgerKind;
  amount: number;
  memberId: string;
}

export interface SettlementInput {
  members: SettlementMember[];
  /** Chỉ các buổi đã chơi (live/closed) */
  sessions: SettlementSession[];
  ledger: SettlementLedgerItem[];
  plan: 1 | 2;
  fixedRate: number;
  excluded: readonly string[];
  accountantId: string | null;
}

export interface SettlementRow {
  memberId: string;
  name: string;
  sessions: number;
  losses: number;
  burden: number;
  advanced: number;
  net: number;
  isAccountant: boolean;
}

export interface SettlementResult {
  rows: SettlementRow[];
  sessionCount: number;
  sessionCost: number;
  expenseTotal: number;
  incomeTotal: number;
  totalCost: number;
  totalLosses: number;
  /** Phương án 1: tổng chi phí / tổng trận thua · Phương án 2: đơn giá cố định */
  unitPrice: number;
  /** Phần hụt (phương án 2) */
  shortfall: number;
  /** Σ net — chỉ còn phần dư làm tròn */
  netSum: number;
}

const roundUpThousand = (v: number) => Math.max(0, Math.ceil(v / 1000) * 1000);

export function computeSettlement(input: SettlementInput): SettlementResult {
  const { members, sessions, ledger, plan, fixedRate, excluded, accountantId } = input;

  const sessionCost = sessions.reduce((a, s) => a + s.cost, 0);
  const expenseTotal = ledger.filter((i) => i.kind === 'expense').reduce((a, i) => a + i.amount, 0);
  const incomeTotal = ledger.filter((i) => i.kind === 'income').reduce((a, i) => a + i.amount, 0);
  const totalCost = sessionCost + expenseTotal - incomeTotal;

  // Đếm buổi & trận thua từng người
  const stats = new Map<string, { sessions: number; losses: number }>();
  for (const m of members) stats.set(m.id, { sessions: 0, losses: 0 });
  for (const s of sessions) {
    for (const r of s.results) {
      const st = stats.get(r.memberId);
      if (!st) continue;
      st.sessions += 1;
      st.losses += r.losses;
    }
  }
  const totalLosses = [...stats.values()].reduce((a, s) => a + s.losses, 0);

  const excludedSet = new Set(excluded);
  const eligible = members.filter((m) => !excludedSet.has(m.id)).length;
  const shortfall = totalCost - totalLosses * fixedRate;
  const share = eligible ? shortfall / eligible : 0;
  const unitPrice = plan === 1 ? (totalLosses ? totalCost / totalLosses : 0) : fixedRate;

  const rows: SettlementRow[] = members.map((m) => {
    const st = stats.get(m.id) ?? { sessions: 0, losses: 0 };
    const raw = plan === 1 ? st.losses * unitPrice : st.losses * fixedRate + (excludedSet.has(m.id) ? 0 : share);
    const burden = roundUpThousand(raw);

    const paidExpense = ledger.filter((i) => i.kind === 'expense' && i.memberId === m.id).reduce((a, i) => a + i.amount, 0);
    const heldIncome = ledger.filter((i) => i.kind === 'income' && i.memberId === m.id).reduce((a, i) => a + i.amount, 0);
    const advanced = (m.id === accountantId ? sessionCost : 0) + paidExpense - heldIncome;

    return {
      memberId: m.id,
      name: m.name,
      sessions: st.sessions,
      losses: st.losses,
      burden,
      advanced,
      net: burden - advanced,
      isAccountant: m.id === accountantId,
    };
  });

  return {
    rows,
    sessionCount: sessions.length,
    sessionCost,
    expenseTotal,
    incomeTotal,
    totalCost,
    totalLosses,
    unitPrice,
    shortfall,
    netSum: rows.reduce((a, r) => a + r.net, 0),
  };
}

/** Tình trạng quỹ do Kế toán giữ */
export interface FundSummary {
  advanced: number;
  toCollect: number;
  collected: number;
  pendingSum: number;
  pendingIds: string[];
  owingCount: number;
  percent: number;
}

export function computeFund(result: SettlementResult, payments: Record<string, PayStatus>): FundSummary {
  const acc = result.rows.find((r) => r.isAccountant);
  const owe = result.rows.filter((r) => !r.isAccountant && r.net > 0);
  const statusOf = (id: string): PayStatus => payments[id] ?? 'none';
  const toCollect = owe.reduce((a, r) => a + r.net, 0);
  const collected = owe.filter((r) => statusOf(r.memberId) === 'done').reduce((a, r) => a + r.net, 0);
  const pending = owe.filter((r) => statusOf(r.memberId) === 'pending');
  return {
    advanced: acc?.advanced ?? 0,
    toCollect,
    collected,
    pendingSum: pending.reduce((a, r) => a + r.net, 0),
    pendingIds: pending.map((r) => r.memberId),
    owingCount: owe.filter((r) => statusOf(r.memberId) === 'none').length,
    percent: toCollect ? Math.round((collected / toCollect) * 100) : 0,
  };
}

/** Nhãn trạng thái thanh toán cho 1 dòng */
export type PayTone = 'treasurer' | 'neutral' | 'receive' | 'done' | 'pending' | 'owe';

export function paymentLabel(row: Pick<SettlementRow, 'isAccountant' | 'net'>, status: PayStatus): { label: string; tone: PayTone } {
  if (row.isAccountant) return { label: 'Thủ quỹ', tone: 'treasurer' };
  if (!row.net) return { label: 'Không phát sinh', tone: 'neutral' };
  if (row.net < 0) return status === 'done' ? { label: 'Đã nhận lại', tone: 'done' } : { label: 'Chờ nhận lại', tone: 'receive' };
  if (status === 'done') return { label: 'Đã đóng', tone: 'done' };
  if (status === 'pending') return { label: 'Chờ xác nhận', tone: 'pending' };
  return { label: 'Chưa đóng', tone: 'owe' };
}
