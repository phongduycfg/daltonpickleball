import { ChartNoAxesColumn } from 'lucide-react';
import { CrownMark, Laurel } from '@/components/brand/icons';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { cn } from '@/lib/utils';

export interface RankRow {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  losses: number;
  sessions: number;
  avg: number;
}

const PODIUM = {
  1: { laurel: '#E3C02E', ring: 'bg-[#FACC15] shadow-[0_0_24px_rgba(250,204,21,.45)]', badge: 'bg-[#FACC15]', box: 'min-h-[156px] border-[#FACC15]/40 bg-[linear-gradient(180deg,#6B5E12,#2B2A12)]' },
  2: { laurel: '#94A3D8', ring: 'bg-[#CBD5E1]', badge: 'bg-[#E2E8F0]', box: 'min-h-[138px] border-sky-300/25 bg-[linear-gradient(180deg,#1E3A64,#13213A)]' },
  3: { laurel: '#D9773A', ring: 'bg-[#F59E5B]', badge: 'bg-[#F59E5B]', box: 'min-h-[138px] border-orange-300/25 bg-[linear-gradient(180deg,#5A2323,#2A1418)]' },
} as const;
const RANK_BADGE = ['bg-[#FACC15] text-ink', 'bg-[#E2E8F0] text-ink', 'bg-[#F59E5B] text-ink'];

/** Bục vinh danh top 3 thua nhiều nhất — vương miện chỉ trên hạng nhất */
export function Podium({ rows }: { rows: RankRow[] }) {
  const top = rows.slice(0, 3).map((r, i) => ({ r, rank: (i + 1) as 1 | 2 | 3 }));
  const ordered = [top[1], top[0], top[2]].filter((x): x is { r: RankRow; rank: 1 | 2 | 3 } => !!x);

  return (
    <div className="grid grid-cols-3 items-end gap-2 pt-5">
      {ordered.map(({ r, rank }) => {
        const s = PODIUM[rank];
        return (
          <div key={r.memberId} className={cn('flex flex-col items-center', ordered.length < 3 && rank === 1 && 'col-start-2')}>
            <div className={cn('relative grid aspect-square w-full max-w-[108px] place-items-center', rank === 1 ? '-mb-3' : '-mb-2')}>
              <Laurel color={s.laurel} />
              {rank === 1 ? <CrownMark className="absolute -top-4 w-12 drop-shadow-[0_0_10px_rgba(250,204,21,.6)]" /> : null}
              <div className={cn('relative rounded-full p-[3px]', s.ring)}>
                <MemberAvatar member={{ id: r.memberId, name: r.name, avatarUrl: r.avatarUrl }} size={rank === 1 ? 'lg' : 'md2'} />
              </div>
              <span className={cn('absolute bottom-[4%] left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full border-2 border-bg text-sm font-extrabold text-ink', s.badge)}>
                {rank}
              </span>
            </div>
            <div className={cn('w-full rounded-2xl border px-1.5 pb-1.5 pt-4 text-center', s.box)}>
              <div className="truncate text-sm font-bold">{r.name}</div>
              <div className={cn('mt-1 text-[28px] font-extrabold leading-none', rank === 1 ? 'text-[#FDE047]' : 'text-lime')}>{r.losses}</div>
              <div className="text-xs text-slate-200">trận thua</div>
              <div className="mt-2 flex h-8 items-center justify-between gap-1 rounded-xl border border-white/10 bg-black/30 px-1.5">
                <span className="flex items-center gap-0.5 whitespace-nowrap text-[11px] text-slate-300">
                  <ChartNoAxesColumn className="size-3 text-lime" aria-hidden />
                  TB/buổi
                </span>
                <b className={cn('text-[13px]', rank === 1 ? 'text-[#FDE047]' : 'text-white')}>
                  {r.avg.toFixed(1)}
                </b>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Bảng xếp hạng đầy đủ (thua trận) */
export function RankTable({ rows, sessionCount }: { rows: RankRow[]; sessionCount: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid h-11 grid-cols-[28px_1fr_40px_44px_88px] items-center gap-1 border-b border-white/[.07] px-3 text-[11px] font-semibold text-slate-300">
        <span className="text-center">#</span>
        <span className="pl-9">Thành viên</span>
        <span className="text-center leading-tight">Tổng thua</span>
        <span className="text-center leading-tight">TB/ buổi</span>
        <span className="text-center">Buổi chơi</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.memberId} className="grid grid-cols-[28px_1fr_40px_44px_88px] items-center gap-1 border-b border-white/[.05] px-3 py-2 last:border-0">
          <span className={cn('mx-auto grid size-6 place-items-center rounded-full text-xs font-bold', RANK_BADGE[i] ?? 'bg-card2 text-slate-200')}>{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2">
            <MemberAvatar member={{ id: r.memberId, name: r.name, avatarUrl: r.avatarUrl }} size="xs" />
            <span className="truncate text-[13px]">{r.name}</span>
          </span>
          <span className="text-center text-sm font-bold">{r.losses}</span>
          <span className="text-center text-[13px] text-slate-200">{r.avg.toFixed(1)}</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-lime" style={{ width: `${Math.round((r.sessions / (sessionCount || 1)) * 100)}%` }} />
            </span>
            <span className="w-8 text-right text-[11px] tabular-nums text-slate-300">
              {r.sessions}/{sessionCount}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
