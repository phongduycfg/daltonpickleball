'use client';

import { useState } from 'react';
import { CalendarDays, ChevronRight, CircleCheck, Clock, Coins, MapPin, Undo2, UserPlus, Users } from 'lucide-react';
import type { Session } from '@/types/app';
import { AvatarStack } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import { useNow } from '@/hooks/use-now';
import { useSessionScoring } from '@/hooks/use-session-scoring';
import { LossList } from '@/components/session/loss-list';
import { AttendanceSheet } from '@/components/session/attendance-sheet';
import { SessionSheet } from '@/components/session/session-sheet';
import { courtBackground, venueTone } from '@/lib/court-art';
import { elapsed, fullDate, weekdayLong } from '@/lib/dates';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';

const PREVIEW_ROWS = 5;

/** Home: thẻ buổi chơi (đang diễn ra / gần nhất) + bảng ghi trận thua */
export function LivePanel({ session, monthTotals }: { session: Session; monthTotals: Record<string, number> }) {
  const { members, venues, venue, can } = useClub();
  const scoring = useSessionScoring(session);
  const [attendOpen, setAttendOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const live = session.status === 'live';
  const now = useNow(1000, live);
  const v = venue(session.venueId);
  const present = members.filter((m) => scoring.isPresent(m.id));

  return (
    <>
      {/* Thẻ buổi chơi */}
      <div className="card overflow-hidden">
        <div
          className="relative min-h-[244px] bg-cover bg-right p-4"
          style={{
            backgroundImage: `linear-gradient(90deg,#0F1A2C 30%,rgba(15,26,44,.85) 55%,rgba(15,26,44,.1) 100%),linear-gradient(0deg,#0F1A2C 0%,rgba(15,26,44,0) 30%),${courtBackground(venueTone(session.venueId, venues), true)}`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl border border-lime/20 bg-lime/10 text-lime">
              <CalendarDays className="size-4" aria-hidden />
            </span>
            <span className="text-[15px] font-semibold">{live ? 'Buổi chơi hôm nay' : 'Buổi chơi gần nhất'}</span>
            {live ? (
              <span className="flex h-6 items-center gap-1 rounded-full bg-live px-2 text-[11px] font-bold shadow-[0_0_14px_rgba(239,68,68,.5)]">
                <span className="size-2 animate-blink rounded-full bg-white" aria-hidden />
                LIVE
              </span>
            ) : null}
          </div>
          <div className="mt-3 text-[26px] font-extrabold leading-none tracking-tight">
            {fullDate(session.date)} <span className="text-base font-bold">({weekdayLong(session.date)})</span>
          </div>
          <div className="mt-2 text-lg font-bold tabular-nums">
            {session.start} - {session.end}
          </div>
          <div className="mt-4 flex max-w-[52%] items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <div className="text-sm font-semibold leading-tight">{v?.name ?? 'Sân đã xoá'}</div>
              {v?.area ? <div className="mt-0.5 text-xs text-slate-300">{v.area}</div> : null}
            </div>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-2xl border border-lime/40 bg-ink/85 px-3 py-2 shadow-[0_0_24px_rgba(215,245,49,.15)] backdrop-blur">
            {live ? <Clock className="size-5 text-lime" aria-hidden /> : <CircleCheck className="size-5 text-lime" aria-hidden />}
            <div className="text-center">
              <div className="text-[11px] text-lime/90">{live ? 'Đang diễn ra' : 'Đã kết thúc'}</div>
              <div className="text-xl font-extrabold leading-none tabular-nums text-lime" suppressHydrationWarning>
                {live ? (now === null ? '--:--:--' : elapsed(session.startedAt, now)) : `#${session.seq ?? '–'}`}
              </div>
            </div>
          </div>
        </div>

        <div className="m-3 mt-0 grid grid-cols-[1fr_1px_1fr] rounded-2xl border border-white/[.06] bg-deep">
          <button type="button" onClick={() => setDetailOpen(true)} className="press flex min-w-0 items-center gap-2.5 p-3 text-left" aria-label="Xem và sửa chi phí buổi">
            <span className="icon-bubble size-10 shrink-0">
              <Coins className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-slate-300">Sân + nước</div>
              <div className="truncate text-lg font-extrabold leading-tight tabular-nums">{vnd(session.cost)}</div>
            </div>
          </button>
          <span className="my-3 bg-white/10" aria-hidden />
          <button type="button" onClick={() => setAttendOpen(true)} className="press min-w-0 p-3 text-left" aria-label="Điểm danh thành viên">
            <div className="flex items-center gap-2">
              <Users className="size-5 shrink-0 text-lime" aria-hidden />
              <div>
                <div className="text-xs leading-tight text-slate-300">Có mặt</div>
                <div className="text-lg font-extrabold leading-tight">
                  {present.length}/{members.length}
                </div>
              </div>
            </div>
            {present.length ? (
              <div className="mt-1.5">
                <AvatarStack members={present} max={4} />
              </div>
            ) : null}
          </button>
        </div>
      </div>

      {/* Ghi nhận trận thua */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 p-3">
          <span className="icon-bubble size-9 shrink-0">
            <Users className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">
            {live ? 'Trận thua hôm nay' : `Trận thua buổi #${session.seq ?? '–'}`} ({present.length})
          </div>
          <button
            type="button"
            onClick={() => setAttendOpen(true)}
            className="press flex h-9 shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-card2 px-2.5 text-xs font-medium"
          >
            <UserPlus className="size-4" aria-hidden />
            Thêm<span className="hidden min-[420px]:inline">&nbsp;thành viên</span>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 pb-2 text-[11px] text-slate-400">
          <span>Chạm tên = có mặt · ô màu = tổng tháng</span>
          {can.score ? (
            <button type="button" onClick={scoring.undo} disabled={!scoring.canUndo} className="press flex items-center gap-1 text-slate-300 disabled:opacity-30">
              <Undo2 className="size-3.5" aria-hidden />
              Hoàn tác
            </button>
          ) : null}
        </div>
        <LossList scoring={scoring} monthTotals={monthTotals} limit={showAll ? undefined : PREVIEW_ROWS} />
        {members.length > PREVIEW_ROWS ? (
          <div className="p-3">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="press flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-card2 text-sm text-slate-200"
              aria-expanded={showAll}
            >
              {showAll ? 'Thu gọn' : `Xem tất cả thành viên (${members.length})`}
              <ChevronRight className={cn('size-4 transition-transform', showAll && '-rotate-90')} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <AttendanceSheet open={attendOpen} onOpenChange={setAttendOpen} scoring={scoring} />
      <SessionSheet session={session} scoring={scoring} monthTotals={monthTotals} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  );
}
