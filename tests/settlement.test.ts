import { describe, expect, it } from 'vitest';
import { computeFund, computeSettlement, paymentLabel } from '../lib/settlement';

const members = [
  { id: 'kt', name: 'Dũng' },
  { id: 'a', name: 'Tuấn' },
  { id: 'b', name: 'Nam' },
  { id: 'c', name: 'An' },
];

// 2 buổi, mỗi buổi 600.000đ
const sessions = [
  { cost: 600_000, results: [{ memberId: 'kt', losses: 1 }, { memberId: 'a', losses: 3 }, { memberId: 'b', losses: 2 }] },
  { cost: 600_000, results: [{ memberId: 'kt', losses: 0 }, { memberId: 'a', losses: 2 }, { memberId: 'b', losses: 2 }, { memberId: 'c', losses: 0 }] },
];

describe('computeSettlement', () => {
  it('phương án 1: chia đều theo tổng trận thua', () => {
    const r = computeSettlement({ members, sessions, ledger: [], plan: 1, fixedRate: 30_000, excluded: [], accountantId: 'kt' });
    expect(r.totalCost).toBe(1_200_000);
    expect(r.totalLosses).toBe(10);
    expect(r.unitPrice).toBe(120_000);
    const a = r.rows.find((x) => x.memberId === 'a')!;
    expect(a).toMatchObject({ sessions: 2, losses: 5, burden: 600_000, advanced: 0, net: 600_000 });
    // Kế toán ứng toàn bộ sân + nước → được nhận lại
    const kt = r.rows.find((x) => x.memberId === 'kt')!;
    expect(kt.advanced).toBe(1_200_000);
    expect(kt.net).toBe(120_000 - 1_200_000);
    // Tổng net = 0 khi không có phần dư làm tròn
    expect(r.netSum).toBe(0);
  });

  it('phương án 2: cố định/trận + chia phần hụt, có loại trừ', () => {
    const r = computeSettlement({ members, sessions, ledger: [], plan: 2, fixedRate: 30_000, excluded: ['c'], accountantId: 'kt' });
    // hụt = 1.200.000 − 10×30.000 = 900.000 chia 3 người (trừ An) = 300.000
    expect(r.shortfall).toBe(900_000);
    expect(r.rows.find((x) => x.memberId === 'c')!.burden).toBe(0);
    expect(r.rows.find((x) => x.memberId === 'a')!.burden).toBe(5 * 30_000 + 300_000);
    expect(r.netSum).toBe(0);
  });

  it('khoản chi do thành viên ứng được trừ, khoản thu đang giữ được cộng', () => {
    const r = computeSettlement({
      members,
      sessions,
      ledger: [
        { kind: 'expense', amount: 100_000, memberId: 'b' },
        { kind: 'income', amount: 200_000, memberId: 'a' },
      ],
      plan: 1,
      fixedRate: 30_000,
      excluded: [],
      accountantId: 'kt',
    });
    expect(r.totalCost).toBe(1_100_000);
    expect(r.rows.find((x) => x.memberId === 'b')!.advanced).toBe(100_000);
    expect(r.rows.find((x) => x.memberId === 'a')!.advanced).toBe(-200_000);
    // làm tròn lên 1.000đ nên Σ net ≥ 0 và < số người × 1.000
    expect(r.netSum).toBeGreaterThanOrEqual(0);
    expect(r.netSum).toBeLessThan(members.length * 1000);
  });

  it('kỳ chưa có trận thua không chia cho 0', () => {
    const r = computeSettlement({ members, sessions: [], ledger: [], plan: 1, fixedRate: 30_000, excluded: [], accountantId: null });
    expect(r.unitPrice).toBe(0);
    expect(r.rows.every((x) => x.burden === 0 && x.net === 0)).toBe(true);
  });
});

describe('computeFund & paymentLabel', () => {
  it('tính tiến độ thu quỹ', () => {
    const r = computeSettlement({ members, sessions, ledger: [], plan: 1, fixedRate: 30_000, excluded: [], accountantId: 'kt' });
    const f = computeFund(r, { a: 'done', b: 'pending' });
    expect(f.toCollect).toBe(600_000 + 480_000);
    expect(f.collected).toBe(600_000);
    expect(f.pendingIds).toEqual(['b']);
    expect(f.percent).toBe(56);
  });

  it('nhãn trạng thái', () => {
    expect(paymentLabel({ isAccountant: true, net: -5 }, 'none').label).toBe('Thủ quỹ');
    expect(paymentLabel({ isAccountant: false, net: 10 }, 'pending').label).toBe('Chờ xác nhận');
    expect(paymentLabel({ isAccountant: false, net: -10 }, 'none').label).toBe('Chờ nhận lại');
    expect(paymentLabel({ isAccountant: false, net: 0 }, 'none').label).toBe('Không phát sinh');
  });
});
