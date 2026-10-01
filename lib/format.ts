/** Định dạng tiền theo thiết kế: 850,000đ */
export function vnd(n: number): string {
  return `${Math.round(n || 0).toLocaleString('en-US')}đ`;
}

/** Rút gọn tiền: 850k · 1.3tr */
export function shortMoney(n: number): string {
  const v = Math.round(n || 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}tr`;
  return `${Math.round(v / 1000)}k`;
}

/** Số có dấu phẩy cho ô nhập tiền (rỗng khi 0) */
export function formatAmountInput(n: number): string {
  return n ? n.toLocaleString('en-US') : '';
}

/** Đọc số tiền từ chuỗi người dùng gõ (bỏ mọi ký tự không phải số) */
export function parseAmountInput(raw: string): number {
  const v = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(v) ? Math.min(v, 2_000_000_000) : 0;
}

/** Trình độ: +2 · 0 · −1 (dấu trừ chuẩn) */
export function formatSkill(v: number): string {
  const n = Math.round(v);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
}

export function skillName(v: number): string {
  if (v >= 3) return 'Cao thủ';
  if (v >= 2) return 'Giỏi';
  if (v >= 1) return 'Khá';
  if (v === 0) return 'Trung bình';
  if (v >= -1) return 'Đang lên';
  if (v >= -2) return 'Tập sự';
  return 'Mới chơi';
}

/** Bỏ dấu tiếng Việt */
export function stripVietnamese(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

/** Chữ cái đầu cho avatar */
export function initialOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}
