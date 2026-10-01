import { describe, expect, it } from 'vitest';
import { computeSettlement } from '../lib/settlement';
import { buildSnapshot, parseSnapshot } from '../lib/snapshot';
import { viewFromSettlement, viewFromSnapshot } from '../lib/payments-view';
import { byDateTime, sessionTitle } from '../lib/session-view';

const members = [
  { id: 'kt', name: 'Dũng', email: 'd@x.vn', avatarUrl: null, role: 'accountant' as const, skill: 0 },
  { id: 'a', name: 'Tuấn', email: 't@x.vn', avatarUrl: null, role: 'admin' as const, skill: 1 },
  { id: 'b', name: 'Nam', email: 'n@x.vn', avatarUrl: null, role: 'member' as const, skill: 0 },
  { id: 'c', name: 'An', email: 'a@x.vn', avatarUrl: null, role: 'member' as const, skill: -1 },
];
const sessions = [{ cost: 600_000, results: [{ memberId: 'kt', losses: 1 }, { memberId: 'a', losses: 3 }, { memberId: 'b', losses: 2 }] }];
const ledger = [{ id: 'l1', kind: 'expense' as const, description: 'Mua bóng', amount: 120_000, memberId: 'b' }];

describe('màn Thanh toán', () => {
  const result = computeSettlement({ members, sessions, ledger, plan: 1, fixedRate: 30_000, excluded: [], accountantId: 'kt' });

  it('kỳ hiện tại: ẩn người không tham gia, xếp theo trận thua giảm dần', () => {
    const v = viewFromSettlement({ result, plan: 1, fixedRate: 30_000, payments: { a: 'pending' }, ledger, members });
    expect(v.rows.map((r) => r.memberId)).toEqual(['a', 'b', 'kt']);
    expect(v.rows[0]).toMatchObject({ status: 'pending', label: 'Chờ xác nhận', tone: 'pending' });
    expect(v.items[0]).toMatchObject({ memberName: 'Nam', memberId: 'b', id: 'l1' });
    expect(v.memberCount).toBe(3);
  });

  it('kỳ đã đóng: snapshot hợp lệ cho cùng kết quả hiển thị', () => {
    const snap = buildSnapshot({
      result,
      plan: 1,
      fixedRate: 30_000,
      payments: { a: 'done' },
      items: [{ kind: 'expense', description: 'Mua bóng', amount: 120_000, memberName: 'Nam' }],
      bank: { bin: '970436', accountNo: '0123456789', owner: 'DUNG', syntax: 'DALTON [TEN] [KY]' },
      firstDate: '2026-10-02',
      lastDate: '2026-10-02',
    });
    const parsed = parseSnapshot(JSON.parse(JSON.stringify(snap)));
    expect(parsed).not.toBeNull();
    const v = viewFromSnapshot(parsed!);
    expect(v.rows.map((r) => r.memberId)).toEqual(['a', 'b', 'kt']);
    expect(v.rows[0]).toMatchObject({ status: 'done', label: 'Đã đóng', tone: 'done' });
    expect(v.items[0]?.id).toBeNull();
    expect(v.totalCost).toBe(720_000);
  });

  it('snapshot hỏng → null (không làm sập trang)', () => {
    expect(parseSnapshot({ version: 2 })).toBeNull();
  });
});

describe('buổi chơi', () => {
  it('tiêu đề và sắp xếp theo ngày giờ', () => {
    expect(sessionTitle({ seq: 3, date: '2026-10-05', start: '17:00', end: '19:00' })).toBe('Buổi #3 · T2 05/10 · 17:00–19:00');
    expect(sessionTitle({ seq: null, date: '2026-10-04', start: '07:00', end: '09:00' })).toBe('CN 04/10 · 07:00–09:00');
    const list = [
      { date: '2026-10-05', start: '17:00' },
      { date: '2026-10-05', start: '07:00' },
      { date: '2026-10-01', start: '19:00' },
    ].sort(byDateTime);
    expect(list.map((s) => `${s.date} ${s.start}`)).toEqual(['2026-10-01 19:00', '2026-10-05 07:00', '2026-10-05 17:00']);
  });
});
