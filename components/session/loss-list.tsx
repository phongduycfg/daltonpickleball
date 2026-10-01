'use client';

import { useMemo } from 'react';
import { useClub } from '@/components/providers/club-provider';
import type { SessionScoring } from '@/hooks/use-session-scoring';
import { LossRow } from './loss-row';

/**
 * Danh sách ghi kèo của 1 buổi. Người có mặt lên trước.
 * `monthTotals`: tổng trận thua cả tháng theo server — cộng thêm phần đang chờ lưu để hiển thị tức thì.
 */
export function LossList({ scoring, monthTotals, limit }: { scoring: SessionScoring; monthTotals: Record<string, number>; limit?: number }) {
  const { members } = useClub();
  const { isPresent, lossOf, pendingDelta, kingId, editable, pulse, toggle, inc, dec } = scoring;

  const rows = useMemo(() => {
    const sorted = [...members].sort((a, b) => Number(isPresent(b.id)) - Number(isPresent(a.id)));
    return limit ? sorted.slice(0, limit) : sorted;
  }, [members, isPresent, limit]);

  const totalOf = (id: string) => (monthTotals[id] ?? 0) + pendingDelta(id);
  const monthMax = Math.max(1, ...members.map((m) => totalOf(m.id)));

  return (
    <div>
      {rows.map((m, i) => (
        <LossRow
          key={m.id}
          index={i}
          member={m}
          present={isPresent(m.id)}
          losses={lossOf(m.id)}
          monthTotal={totalOf(m.id)}
          monthMax={monthMax}
          isKing={kingId === m.id}
          editable={editable}
          pulseKey={pulse?.id === m.id ? pulse.n : null}
          onToggle={() => toggle(m.id)}
          onInc={() => inc(m.id)}
          onDec={() => dec(m.id)}
        />
      ))}
    </div>
  );
}
