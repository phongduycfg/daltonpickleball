import { describe, expect, it } from 'vitest';
import { computeHandicap } from '../lib/handicap';
import { isBankValid, renderTransferNote, vietQrImageUrl } from '../lib/vietqr';
import { formatSkill, parseAmountInput, shortMoney, vnd } from '../lib/format';
import { addDays, elapsed, startOfWeek, todayVN } from '../lib/dates';

describe('computeHandicap', () => {
  it('Đội A (+3) chấp Đội B (−1) 4 trái', () => {
    expect(computeHandicap([2, 1], [-1, 0])).toEqual({ sumA: 3, sumB: -1, balls: 4, strong: 'A', weak: 'B' });
  });
  it('kèo cân', () => {
    expect(computeHandicap([1, -1], [0, 0]).balls).toBe(0);
  });
});

describe('vietqr', () => {
  it('nội dung chuyển khoản bỏ dấu, viết hoa, tối đa 25 ký tự', () => {
    expect(renderTransferNote('DALTON [TEN] [KY]', 'Tuấn', 'T10')).toBe('DALTON TUAN T10');
    expect(renderTransferNote('Quỹ [TEN]', 'Nguyễn Văn Đức Long Lanh', 'T1').length).toBeLessThanOrEqual(25);
  });
  it('kiểm tra tài khoản & URL ảnh QR', () => {
    const bank = { bin: '970436', accountNo: '1903668899', owner: 'NGUYEN VAN DUNG' };
    expect(isBankValid(bank)).toBe(true);
    expect(isBankValid({ ...bank, accountNo: '12a' })).toBe(false);
    expect(vietQrImageUrl(bank, 672000, 'DALTON NAM T10')).toBe(
      'https://img.vietqr.io/image/970436-1903668899-compact2.png?amount=672000&addInfo=DALTON+NAM+T10&accountName=NGUYEN+VAN+DUNG',
    );
  });
});

describe('format & dates', () => {
  it('tiền & trình độ', () => {
    expect(vnd(850000)).toBe('850,000đ');
    expect(shortMoney(1_300_000)).toBe('1.3tr');
    expect(shortMoney(-500_000)).toBe('-500k');
    expect(formatSkill(-2)).toBe('−2');
    expect(formatSkill(3)).toBe('+3');
    expect(parseAmountInput('850,000đ')).toBe(850000);
  });
  it('ngày giờ', () => {
    expect(todayVN(new Date('2026-09-30T18:30:00Z'))).toBe('2026-10-01');
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(startOfWeek('2026-10-01')).toBe('2026-09-28');
    expect(elapsed('2026-10-01T07:00:00Z', Date.parse('2026-10-01T08:24:36Z'))).toBe('01:24:36');
  });
});
