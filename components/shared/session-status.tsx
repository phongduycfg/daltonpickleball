import { CircleCheck, Clock } from 'lucide-react';
import type { SessionStatus } from '@/types/database';
import { cn } from '@/lib/utils';

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; className: string }> = {
  live: { label: 'Đang diễn ra', className: 'bg-live text-white' },
  closed: { label: 'Đã kết thúc', className: 'bg-done text-white' },
  scheduled: { label: 'Sắp diễn ra', className: 'bg-soon text-white' },
};

/** Nhãn trạng thái buổi chơi (LIVE nhấp nháy) */
export function SessionStatusPill({ status, className }: { status: SessionStatus; className?: string }) {
  const meta = SESSION_STATUS_META[status];
  return (
    <span className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold', meta.className, className)}>
      {status === 'live' ? (
        <span className="size-2 animate-blink rounded-full bg-white" aria-hidden />
      ) : status === 'closed' ? (
        <CircleCheck className="size-3.5" aria-hidden />
      ) : (
        <Clock className="size-3.5" aria-hidden />
      )}
      {meta.label}
    </span>
  );
}
