'use client';

import { useState } from 'react';
import { Scale, Shuffle } from 'lucide-react';
import { SelectField } from '@/components/shared/select-field';
import { useClub } from '@/components/providers/club-provider';
import { useHaptics } from '@/hooks/use-haptics';
import { computeHandicap } from '@/lib/handicap';
import { formatSkill } from '@/lib/format';
import { cn } from '@/lib/utils';

type Slot = 'a1' | 'a2' | 'b1' | 'b2';
const SLOTS: Slot[] = ['a1', 'a2', 'b1', 'b2'];

/** Chia đội & tính chấp: chênh 1 điểm trình = 1 trái */
export function HandicapCard() {
  const { members } = useClub();
  const haptic = useHaptics();
  const [teams, setTeams] = useState<Record<Slot, string>>(() => ({
    a1: members[0]?.id ?? '',
    a2: members[1]?.id ?? '',
    b1: members[2]?.id ?? '',
    b2: members[3]?.id ?? '',
  }));

  const skillOf = (id: string) => members.find((m) => m.id === id)?.skill ?? 0;
  const result = computeHandicap([skillOf(teams.a1), skillOf(teams.a2)], [skillOf(teams.b1), skillOf(teams.b2)]);

  function randomize() {
    const ids = members.map((m) => m.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j] as string, ids[i] as string];
    }
    setTeams({ a1: ids[0] ?? '', a2: ids[1] ?? '', b1: ids[2] ?? '', b2: ids[3] ?? '' });
    haptic();
  }

  if (members.length < 4) return null;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className="icon-bubble size-9 shrink-0">
          <Scale className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Chia đội & tính chấp</div>
          <div className="text-[11px] text-slate-400">Chênh 1 điểm trình = 1 trái</div>
        </div>
        <button type="button" onClick={randomize} className="press flex h-9 shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-card2 px-2.5 text-xs">
          <Shuffle className="size-4" aria-hidden />
          Ngẫu nhiên
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        {(['A', 'B'] as const).map((side) => (
          <div key={side} className={cn('space-y-2', side === 'B' && 'order-3')}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">ĐỘI {side}</span>
              <span className={cn('text-sm font-extrabold tabular-nums', side === 'A' ? 'text-lime' : 'text-sky-300')}>
                {formatSkill(side === 'A' ? result.sumA : result.sumB)}
              </span>
            </div>
            {SLOTS.filter((s) => s.startsWith(side.toLowerCase())).map((slot) => (
              <SelectField
                key={slot}
                aria-label={`Đội ${side}`}
                value={teams[slot]}
                onChange={(e) => setTeams({ ...teams, [slot]: e.target.value })}
                className="!px-3 !pr-8 text-sm"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} disabled={SLOTS.some((s) => s !== slot && teams[s] === m.id)}>
                    {m.name} ({formatSkill(m.skill)})
                  </option>
                ))}
              </SelectField>
            ))}
          </div>
        ))}
        <div className="order-2 pt-8 text-center text-sm font-extrabold italic text-slate-400">VS</div>
      </div>

      <div className={cn('mt-3 rounded-2xl border p-4 text-center', result.balls ? 'border-lime/30 bg-lime/[.06]' : 'border-white/[.07] bg-deep')} aria-live="polite">
        {result.balls ? (
          <>
            <div className="text-sm font-semibold">
              Đội {result.strong} ({formatSkill(result.strong === 'A' ? result.sumA : result.sumB)}) chấp Đội {result.weak} (
              {formatSkill(result.weak === 'A' ? result.sumA : result.sumB)})
            </div>
            <div className="text-[28px] font-extrabold leading-tight text-lime">{result.balls} trái</div>
            <div className="text-xs text-slate-400">
              Tỉ số khởi đầu (A – B):{' '}
              <b className="text-white">
                {result.weak === 'A' ? result.balls : 0} – {result.weak === 'B' ? result.balls : 0}
              </b>
            </div>
          </>
        ) : (
          <div className="text-lg font-bold">⚖️ Kèo cân — không chấp</div>
        )}
      </div>
    </div>
  );
}
