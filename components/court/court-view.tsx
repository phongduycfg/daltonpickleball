'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarOff, ChevronRight, Plus } from 'lucide-react';
import type { Session } from '@/types/app';
import { Button } from '@/components/ui/button';
import { AvatarStack } from '@/components/shared/member-avatar';
import { SessionStatusPill } from '@/components/shared/session-status';
import { SessionSheetHost } from '@/components/session/session-sheet-host';
import { useClub } from '@/components/providers/club-provider';
import { courtBackground, venueTone } from '@/lib/court-art';
import { addDays, dayMonth, fullDate, startOfWeek, weekdayLong, weekdayShort } from '@/lib/dates';
import { vnd } from '@/lib/format';
import { byDateTime } from '@/lib/session-view';
import { cn } from '@/lib/utils';
import { NewSessionSheet } from './new-session-sheet';
import { HandicapCard } from './handicap-card';

const OVERLAY_FEATURED = 'linear-gradient(90deg,rgba(11,20,36,.92) 25%,rgba(11,20,36,.45) 70%,rgba(11,20,36,.2))';
const OVERLAY_CARD = 'linear-gradient(90deg,rgba(11,20,36,.92) 30%,rgba(11,20,36,.5) 75%,rgba(11,20,36,.25))';

/** Màn Sân đấu: dải ngày · buổi chơi trong ngày · lịch sắp tới · chia đội tính chấp */
export function CourtView({ sessions, today, periodTotals }: { sessions: Session[]; today: string; periodTotals: Record<string, number> }) {
  const { members, venues, venue, can } = useClub();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selDate, setSelDate] = useState(today);
  const [view, setView] = useState<'day' | 'upcoming'>('day');
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  // Mở form tạo buổi khi đến từ Home (?new=1)
  useEffect(() => {
    if (params.get('new') === '1' && can.score) {
      setNewOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [params, can.score, router, pathname]);

  // Cuộn ngày hôm nay vào giữa dải ngày
  useEffect(() => {
    stripRef.current?.querySelector(`[data-day="${today}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [today]);

  const sorted = useMemo(() => [...sessions].sort(byDateTime), [sessions]);
  const upcoming = useMemo(() => sorted.filter((s) => s.status === 'scheduled' && s.date >= today), [sorted, today]);
  const days = useMemo(() => {
    const first = sorted[0]?.date ?? today;
    const lastScheduled = sorted.at(-1)?.date ?? today;
    const end = [addDays(today, 13), lastScheduled].sort().at(-1) ?? today;
    const out: string[] = [];
    for (let d = startOfWeek(first < today ? first : today); d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [sorted, today]);
  const dates = useMemo(() => new Set(sorted.map((s) => s.date)), [sorted]);

  const onDay = sorted.filter((s) => s.date === selDate);
  const featured = onDay.find((s) => s.status === 'live') ?? onDay[0] ?? null;
  const others = onDay.filter((s) => s !== featured);
  const opened = openId ? sessions.find((s) => s.id === openId) ?? null : null;

  const presentOf = (s: Session) => members.filter((m) => s.results.some((r) => r.memberId === m.id));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="h-page">Sân đấu</h1>
        {can.score ? (
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="press grid size-11 place-items-center rounded-2xl bg-lime text-ink shadow-[0_0_24px_rgba(215,245,49,.35)]"
            aria-label="Thêm buổi chơi"
          >
            <Plus className="size-6" strokeWidth={2.6} />
          </button>
        ) : null}
      </div>

      <div ref={stripRef} className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1" role="tablist" aria-label="Chọn ngày">
        {days.map((d) => {
          const on = selDate === d;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              data-day={d}
              aria-selected={on}
              aria-label={`${weekdayLong(d)} ${fullDate(d)}`}
              onClick={() => {
                setSelDate(d);
                setView('day');
              }}
              className={cn(
                'press relative flex h-[62px] w-[50px] shrink-0 snap-center flex-col items-center justify-center rounded-2xl border transition',
                on ? 'border-lime bg-lime text-ink shadow-[0_0_20px_rgba(215,245,49,.4)]' : 'border-white/10 bg-card text-white',
              )}
            >
              <span className={cn('text-xs', on ? 'font-semibold' : 'text-slate-300')}>{weekdayShort(d)}</span>
              <span className="text-lg font-bold leading-tight">{Number(d.slice(8, 10))}</span>
              {dates.has(d) && !on ? <span className={cn('absolute bottom-1.5 size-1.5 rounded-full', d === today ? 'bg-live' : 'bg-lime')} aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <div className="seg grid-cols-2">
        <button type="button" onClick={() => setView('day')} className={cn('seg-btn', view === 'day' && 'seg-on')} aria-pressed={view === 'day'}>
          Buổi chơi
        </button>
        <button type="button" onClick={() => setView('upcoming')} className={cn('seg-btn', view === 'upcoming' && 'seg-on')} aria-pressed={view === 'upcoming'}>
          Lịch sắp tới{upcoming.length ? ` (${upcoming.length})` : ''}
        </button>
      </div>

      {view === 'day' ? (
        <div className="space-y-4">
          {featured ? (
            <div
              className={cn(
                'relative flex min-h-[176px] flex-col overflow-hidden rounded-3xl border-2 bg-cover bg-center p-4',
                featured.status === 'live' ? 'border-lime shadow-[0_0_28px_rgba(215,245,49,.25)]' : 'border-white/15',
              )}
              style={{ backgroundImage: `${OVERLAY_FEATURED},${courtBackground(venueTone(featured.venueId, venues))}` }}
            >
              <SessionStatusPill status={featured.status} className="self-start" />
              <div className="mt-3 text-xs font-semibold text-lime">
                {weekdayLong(featured.date)}, {fullDate(featured.date)}
                {featured.seq ? ` · Buổi #${featured.seq}` : ''}
              </div>
              <div className="mt-1 text-2xl font-extrabold leading-none tabular-nums">
                {featured.start} - {featured.end}
              </div>
              <div className="mt-1.5 text-[15px]">{venue(featured.venueId)?.name ?? 'Sân đã xoá'}</div>
              <div className="mt-auto flex items-center gap-2 pt-4">
                {featured.results.length ? <AvatarStack members={presentOf(featured)} max={5} /> : null}
                <span className="text-[15px] font-bold">
                  {featured.results.length}/{members.length}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenId(featured.id)}
                  className={cn(
                    'press ml-auto flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border-2 bg-ink/85 px-3 text-[13px] font-bold',
                    featured.status === 'live' ? 'border-lime text-lime' : 'border-white/30 text-white',
                  )}
                >
                  {featured.status === 'live' ? 'Vào chi tiết' : 'Xem chi tiết'}
                  <ChevronRight className="size-4" strokeWidth={2.6} aria-hidden />
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <span className="icon-bubble mx-auto flex size-12">
                <CalendarOff className="m-auto size-6" aria-hidden />
              </span>
              <div className="mt-3 font-bold">
                Không có buổi chơi {weekdayShort(selDate)} {dayMonth(selDate)}
              </div>
              {can.score ? (
                <Button variant="lime" className="mt-4 w-full" onClick={() => setNewOpen(true)}>
                  <Plus className="size-5" />
                  {selDate < today ? 'Nhập bù buổi đã chơi' : 'Thêm buổi chơi'}
                </Button>
              ) : null}
            </div>
          )}

          {others.length ? (
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold tracking-tight">Các buổi chơi khác</h2>
              {others.map((s) => (
                <SessionCard key={s.id} session={s} onOpen={() => setOpenId(s.id)} footer={
                  <>
                    {s.results.length ? <AvatarStack members={presentOf(s)} max={4} /> : null}
                    <span className="text-sm font-bold">
                      {s.results.length}/{members.length}
                    </span>
                  </>
                } />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onOpen={() => setOpenId(s.id)}
              footer={<span className="text-xs text-slate-300">Dự kiến {vnd(s.cost)}</span>}
            />
          ))}
          {!upcoming.length ? <div className="card p-6 text-center text-sm text-slate-400">Chưa có lịch sắp tới.</div> : null}
        </div>
      )}

      <HandicapCard />

      {opened ? (
        <SessionSheetHost key={opened.id} session={opened} periodTotals={periodTotals} open onOpenChange={(v) => !v && setOpenId(null)} />
      ) : null}
      <NewSessionSheet
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultDate={selDate}
        today={today}
        onCreated={({ id, date, past }) => {
          setSelDate(date);
          setView('day');
          // Buổi nhập bù → mở chi tiết ngay để điểm danh và ghi trận thua
          if (past) setOpenId(id);
        }}
      />
    </section>
  );
}

/** Thẻ buổi chơi nhỏ có ảnh nền sân */
function SessionCard({ session, onOpen, footer }: { session: Session; onOpen: () => void; footer: ReactNode }) {
  const { venue, venues } = useClub();
  return (
    <div
      className="relative flex min-h-[132px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-cover bg-center p-4"
      style={{ backgroundImage: `${OVERLAY_CARD},${courtBackground(venueTone(session.venueId, venues))}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-lime">
            {weekdayLong(session.date)}, {fullDate(session.date)}
            {session.seq ? ` · Buổi #${session.seq}` : ''}
          </div>
          <div className="text-xl font-extrabold leading-tight tabular-nums">
            {session.start} - {session.end}
          </div>
          <div className="truncate text-sm">{venue(session.venueId)?.name ?? 'Sân đã xoá'}</div>
        </div>
        <SessionStatusPill status={session.status} />
      </div>
      <div className="mt-auto flex items-center gap-2 pt-3">
        {footer}
        <button
          type="button"
          onClick={onOpen}
          className="press ml-auto flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/30 bg-ink/85 px-3 text-[13px] font-bold"
        >
          Xem chi tiết
          <ChevronRight className="size-4" strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    </div>
  );
}
