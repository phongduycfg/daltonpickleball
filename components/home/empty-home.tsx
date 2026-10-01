'use client';

import Link from 'next/link';
import { CalendarPlus, Play, Plus } from 'lucide-react';
import type { Session } from '@/types/app';
import { Button } from '@/components/ui/button';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { startSession } from '@/actions/session';
import { dayMonth, periodLabel, weekdayShort } from '@/lib/dates';

/** Kỳ chưa có buổi nào đã chơi */
export function EmptyHome({ next }: { next: Session | null }) {
  const { period, can } = useClub();
  const { pending, run } = useServerAction();

  return (
    <div className="card p-6 text-center">
      <div className="icon-bubble mx-auto size-16">
        <CalendarPlus className="size-8" aria-hidden />
      </div>
      <div className="mt-3 text-xl font-extrabold">{periodLabel(period)} chưa có buổi chơi</div>
      <p className="mt-1 text-sm text-slate-400">
        {next ? `Buổi tiếp theo: ${weekdayShort(next.date)} ${dayMonth(next.date)} · ${next.start}` : 'Tạo lịch chơi trong tab Sân đấu.'}
      </p>
      {can.score && next ? (
        <Button variant="lime" className="mt-4 w-full" disabled={pending} onClick={() => run(() => startSession(next.id), { success: 'Đã bắt đầu buổi' })}>
          <Play className="size-5" />
          Bắt đầu buổi tiếp theo
        </Button>
      ) : null}
      {can.score && !next ? (
        <Button variant="lime" className="mt-4 w-full" asChild>
          <Link href="/court?new=1">
            <Plus className="size-5" />
            Tạo buổi chơi
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
