/** Múi giờ của CLB */
export const CLUB_TZ = 'Asia/Ho_Chi_Minh';

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
const WEEKDAY_LONG = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'] as const;

/** Ngày hôm nay (YYYY-MM-DD) theo giờ Việt Nam */
export function todayVN(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLUB_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function utcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, n: number): string {
  const d = utcNoon(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Thứ 2 đầu tuần chứa ngày iso */
export function startOfWeek(iso: string): string {
  const dow = utcNoon(iso).getUTCDay();
  return addDays(iso, -((dow + 6) % 7));
}

export const weekdayShort = (iso: string) => WEEKDAY_SHORT[utcNoon(iso).getUTCDay()] ?? '';
export const weekdayLong = (iso: string) => WEEKDAY_LONG[utcNoon(iso).getUTCDay()] ?? '';
export const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const fullDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "17:00:00" → "17:00" */
export const hhmm = (t: string) => t.slice(0, 5);

/** "Kỳ 5" */
export const periodLabel = (p: { seq: number }) => `Kỳ ${p.seq}`;
/** Mã kỳ dùng trong nội dung chuyển khoản và xác nhận đóng kỳ: "K5" */
export const periodCode = (p: { seq: number }) => `K${p.seq}`;
/** Khoảng ngày của kỳ: "25/09 – 02/10" · "02/10 – nay" (thêm năm nếu khác năm hiện tại) */
export function periodRange(p: { startDate: string; endDate: string | null }, today: string = todayVN()): string {
  const fmt = (iso: string) => (iso.slice(0, 4) === today.slice(0, 4) ? dayMonth(iso) : fullDate(iso));
  return `${fmt(p.startDate)} – ${p.endDate ? fmt(p.endDate) : 'nay'}`;
}

/** Thời gian đã trôi qua dạng 01:24:36 */
export function elapsed(fromIso: string | null, now: number = Date.now()): string {
  if (!fromIso) return '00:00:00';
  const t = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}

/** "Vừa xong" · "3 phút trước" */
export function timeAgo(ms: number, now: number = Date.now()): string {
  const s = Math.floor((now - ms) / 1000);
  if (s < 30) return 'Vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  return `${Math.floor(s / 3600)} giờ trước`;
}
