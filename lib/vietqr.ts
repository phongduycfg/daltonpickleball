import { BANKS } from './constants';
import { stripVietnamese } from './format';

export interface BankInfo {
  bin: string | null;
  accountNo: string | null;
  owner: string | null;
}

export function bankName(bin: string | null): string {
  return BANKS.find((b) => b.bin === bin)?.name ?? (bin ?? '—');
}

export function isBankValid(b: BankInfo): b is { bin: string; accountNo: string; owner: string } {
  return !!b.bin && /^\d{6}$/.test(b.bin) && !!b.accountNo && /^\d{6,19}$/.test(b.accountNo) && (b.owner ?? '').trim().length >= 3;
}

/**
 * Sinh nội dung chuyển khoản từ cú pháp, ví dụ "DALTON [TEN] [KY]" → "DALTON TUAN T10".
 * Chỉ giữ A-Z, 0-9, khoảng trắng; tối đa 25 ký tự (giới hạn phổ biến của ngân hàng).
 */
export function renderTransferNote(syntax: string, memberName: string, periodCode: string): string {
  const filled = (syntax || 'DALTON [TEN] [KY]')
    .replace(/\[TEN\]/gi, stripVietnamese(memberName).replace(/\s+/g, ''))
    .replace(/\[KY\]/gi, periodCode);
  return stripVietnamese(filled).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 25);
}

/** Ảnh VietQR động (API công khai img.vietqr.io) */
export function vietQrImageUrl(bank: { bin: string; accountNo: string; owner: string }, amount: number, note: string): string {
  const params = new URLSearchParams();
  if (amount > 0) params.set('amount', String(Math.round(amount)));
  if (note) params.set('addInfo', note);
  params.set('accountName', bank.owner);
  return `https://img.vietqr.io/image/${bank.bin}-${bank.accountNo}-compact2.png?${params.toString()}`;
}
