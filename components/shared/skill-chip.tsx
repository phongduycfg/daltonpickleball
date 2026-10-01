import { formatSkill } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Chip trình độ −3..+3 kèm thanh vạch trực quan */
export function SkillChip({ value }: { value: number }) {
  const v = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.06] px-2 py-1" aria-label={`Trình độ ${formatSkill(v)}`}>
      <b className={cn('text-sm tabular-nums', v < 0 ? 'text-slate-300' : 'text-white')}>{formatSkill(v)}</b>
      <span className="flex items-center gap-[2px]" aria-hidden>
        {[-3, -2, -1, 0, 1, 2, 3].map((i) => {
          const on = (v > 0 && i > 0 && i <= v) || (v < 0 && i < 0 && i >= v);
          return (
            <span
              key={i}
              className={cn('w-[3px] rounded-full', i === 0 ? 'h-3 bg-white/50' : on ? (v > 0 ? 'h-2.5 bg-lime' : 'h-2.5 bg-slate-400') : 'h-2.5 bg-white/10')}
            />
          );
        })}
      </span>
    </span>
  );
}
