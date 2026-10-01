import { z } from 'zod';
import type { PayStatus } from '@/types/database';
import type { SettlementResult } from './settlement';
import { paymentLabel } from './settlement';

/**
 * Snapshot lưu vào periods.snapshot khi đóng kỳ — nguồn dữ liệu chỉ đọc
 * cho màn Thanh toán, Bảng xếp hạng và báo cáo PDF của kỳ cũ.
 */
export const snapshotSchema = z.object({
  version: z.literal(1),
  plan: z.union([z.literal(1), z.literal(2)]),
  fixedRate: z.number(),
  sessionCount: z.number(),
  sessionCost: z.number(),
  expenseTotal: z.number(),
  incomeTotal: z.number(),
  totalCost: z.number(),
  totalLosses: z.number(),
  unitPrice: z.number(),
  firstDate: z.string().nullable(),
  lastDate: z.string().nullable(),
  bank: z.object({ bin: z.string().nullable(), accountNo: z.string().nullable(), owner: z.string().nullable(), syntax: z.string() }),
  items: z.array(z.object({ kind: z.enum(['expense', 'income']), description: z.string(), amount: z.number(), memberName: z.string() })),
  rows: z.array(
    z.object({
      memberId: z.string(),
      name: z.string(),
      isAccountant: z.boolean(),
      sessions: z.number(),
      losses: z.number(),
      burden: z.number(),
      advanced: z.number(),
      net: z.number(),
      payStatus: z.enum(['none', 'pending', 'done']),
      statusLabel: z.string(),
    }),
  ),
});

export type PeriodSnapshot = z.infer<typeof snapshotSchema>;

export function buildSnapshot(args: {
  result: SettlementResult;
  plan: 1 | 2;
  fixedRate: number;
  payments: Record<string, PayStatus>;
  items: { kind: 'expense' | 'income'; description: string; amount: number; memberName: string }[];
  bank: PeriodSnapshot['bank'];
  firstDate: string | null;
  lastDate: string | null;
}): PeriodSnapshot {
  const { result, payments } = args;
  return {
    version: 1,
    plan: args.plan,
    fixedRate: args.fixedRate,
    sessionCount: result.sessionCount,
    sessionCost: result.sessionCost,
    expenseTotal: result.expenseTotal,
    incomeTotal: result.incomeTotal,
    totalCost: result.totalCost,
    totalLosses: result.totalLosses,
    unitPrice: result.unitPrice,
    firstDate: args.firstDate,
    lastDate: args.lastDate,
    bank: args.bank,
    items: args.items,
    rows: result.rows.map((r) => {
      const status = payments[r.memberId] ?? 'none';
      return { ...r, payStatus: status, statusLabel: paymentLabel(r, status).label };
    }),
  };
}

/** Đọc snapshot an toàn; trả null nếu dữ liệu hỏng */
export function parseSnapshot(json: unknown): PeriodSnapshot | null {
  const parsed = snapshotSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
