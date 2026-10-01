'use client';

import { Minus, Plus } from 'lucide-react';
import type { Member } from '@/types/app';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { cn } from '@/lib/utils';

/** Màu ô "tổng tháng" theo tỉ lệ so với người thua nhiều nhất */
function toneOf(total: number, max: number): string {
  const r = total / Math.max(1, max);
  if (r >= 0.75) return 'border-[#7F1D2D]/50 bg-[#3B1520] text-[#FB7185]';
  if (r >= 0.5) return 'border-[#7C3A12]/50 bg-[#3A2410] text-warn';
  return 'border-[#14532D]/60 bg-[#10301F] text-[#4ADE80]';
}

/**
 * 1 dòng ghi kèo: thứ hạng · tên (chạm = có mặt/vắng) · (−) số (+) · tổng tháng.
 * Nút 36px + khoảng đệm → vùng chạm thoải mái cho ngón cái.
 */
export function LossRow({
  index,
  member,
  present,
  losses,
  monthTotal,
  monthMax,
  isKing,
  editable,
  pulseKey,
  onToggle,
  onInc,
  onDec,
}: {
  index: number;
  member: Member;
  present: boolean;
  losses: number;
  monthTotal: number;
  monthMax: number;
  isKing: boolean;
  editable: boolean;
  pulseKey: number | null;
  onToggle: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-white/[.06] px-3 py-2">
      <span
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold max-[370px]:hidden',
          isKing ? 'bg-[#4A2A0C] text-warn' : 'bg-[#16233A] text-slate-300',
        )}
      >
        {index + 1}
      </span>

      <button
        type="button"
        onClick={onToggle}
        className={cn('press flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity', present ? 'opacity-100' : 'opacity-40')}
        aria-pressed={present}
        aria-label={`${member.name} ${present ? 'có mặt' : 'vắng'} — chạm để đổi`}
      >
        <MemberAvatar member={member} size="sm" dim={!present} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{member.name}</div>
          {!present ? <div className="text-[11px] text-slate-400">Vắng</div> : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onDec}
          disabled={!editable || !losses}
          className="press grid size-9 place-items-center rounded-xl bg-[#1B2840] text-slate-200 disabled:opacity-40"
          aria-label={`Giảm trận thua ${member.name}`}
        >
          <Minus className="size-5" strokeWidth={2.6} />
        </button>
        <span
          key={pulseKey ?? 'idle'}
          className={cn('w-6 text-center text-base font-bold tabular-nums', present ? 'text-white' : 'text-slate-500', pulseKey !== null && 'animate-bump')}
          aria-live="polite"
        >
          {losses}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={!editable}
          className="press grid size-9 place-items-center rounded-xl bg-lime text-ink shadow-[0_0_14px_rgba(215,245,49,.35)] disabled:opacity-40 disabled:shadow-none"
          aria-label={`Tăng trận thua ${member.name}`}
        >
          <Plus className="size-5" strokeWidth={2.8} />
        </button>
      </div>

      <span className={cn('grid h-8 w-[54px] shrink-0 place-items-center rounded-lg border text-[11px] font-semibold', toneOf(monthTotal, monthMax))} title="Tổng trận thua trong tháng">
        <span className="whitespace-nowrap">
          <b className="text-sm">{monthTotal}</b> Thua
        </span>
      </span>
    </div>
  );
}
