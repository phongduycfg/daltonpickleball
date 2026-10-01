import type { Session } from '@/types/app';
import { dayMonth, weekdayShort } from './dates';

/** Tiêu đề ngắn của buổi: "Buổi #3 · T2 06/10 · 17:00–19:00" */
export function sessionTitle(s: Pick<Session, 'seq' | 'date' | 'start' | 'end'>): string {
  return `${s.seq ? `Buổi #${s.seq} · ` : ''}${weekdayShort(s.date)} ${dayMonth(s.date)} · ${s.start}–${s.end}`;
}

/** Sắp xếp theo ngày + giờ bắt đầu */
export const byDateTime = (a: Pick<Session, 'date' | 'start'>, b: Pick<Session, 'date' | 'start'>) =>
  `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`);
