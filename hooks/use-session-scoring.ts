'use client';

import { useCallback, useMemo, useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Session } from '@/types/app';
import { adjustLoss, setAttendance } from '@/actions/session';
import { useClub } from '@/components/providers/club-provider';
import { useHaptics } from './use-haptics';

type ScoreAction = { memberId: string; kind: 'delta'; delta: 1 | -1 } | { memberId: string; kind: 'attend'; present: boolean };

/**
 * Logic ghi kèo cho 1 buổi, cập nhật lạc quan (optimistic) để bấm (+)/(−) phản hồi tức thì:
 * - Chạm tên: có mặt (0 trận thua) ↔ vắng. Không cho đánh vắng khi còn trận thua.
 * - (+) tự đánh dấu có mặt. (−) không xuống dưới 0.
 * Server (RPC trong Postgres) là nguồn sự thật — lỗi sẽ được hoàn tác tự động.
 */
export function useSessionScoring(session: Session) {
  const { can, member } = useClub();
  const haptic = useHaptics();
  const [, startTransition] = useTransition();
  const [history, setHistory] = useState<string[]>([]);
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);

  const [results, applyOptimistic] = useOptimistic(session.results, (state, a: ScoreAction) => {
    const current = state.find((r) => r.memberId === a.memberId);
    if (a.kind === 'attend') {
      if (a.present) return current ? state : [...state, { memberId: a.memberId, losses: 0 }];
      return state.filter((r) => r.memberId !== a.memberId);
    }
    if (!current) return a.delta > 0 ? [...state, { memberId: a.memberId, losses: 1 }] : state;
    return state.map((r) => (r.memberId === a.memberId ? { ...r, losses: Math.max(0, r.losses + a.delta) } : r));
  });

  const byId = useMemo(() => new Map(results.map((r) => [r.memberId, r.losses])), [results]);
  const serverById = useMemo(() => new Map(session.results.map((r) => [r.memberId, r.losses])), [session.results]);

  const editable = can.score && session.status !== 'scheduled';
  const lossOf = useCallback((id: string) => byId.get(id) ?? 0, [byId]);
  const isPresent = useCallback((id: string) => byId.has(id), [byId]);
  /** Chênh lệch giữa giá trị đang hiển thị và giá trị server (để cộng vào tổng tháng) */
  const pendingDelta = useCallback((id: string) => (byId.get(id) ?? 0) - (serverById.get(id) ?? 0), [byId, serverById]);

  const guard = useCallback((): boolean => {
    if (editable) return true;
    toast.error(session.status === 'scheduled' ? 'Buổi chưa bắt đầu' : 'Cần quyền Ghi kèo');
    return false;
  }, [editable, session.status]);

  const send = useCallback(
    (a: ScoreAction, call: () => Promise<{ ok: boolean; error?: string }>, onFail?: () => void) => {
      startTransition(async () => {
        applyOptimistic(a);
        const res = await call();
        if (!res.ok) {
          toast.error(res.error ?? 'Không lưu được');
          haptic(40);
          onFail?.();
        }
      });
    },
    [applyOptimistic, haptic],
  );

  const bump = useCallback((id: string) => setPulse((p) => ({ id, n: (p?.n ?? 0) + 1 })), []);

  const inc = useCallback(
    (id: string) => {
      if (!guard()) return;
      haptic(18);
      bump(id);
      setHistory((h) => [...h, id]);
      send({ memberId: id, kind: 'delta', delta: 1 }, () => adjustLoss(session.id, id, 1), () =>
        setHistory((h) => {
          const i = h.lastIndexOf(id);
          return i < 0 ? h : [...h.slice(0, i), ...h.slice(i + 1)];
        }),
      );
    },
    [bump, guard, haptic, send, session.id],
  );

  const dec = useCallback(
    (id: string) => {
      if (!guard() || !lossOf(id)) return;
      haptic();
      bump(id);
      setHistory((h) => {
        const i = h.lastIndexOf(id);
        return i < 0 ? h : [...h.slice(0, i), ...h.slice(i + 1)];
      });
      send({ memberId: id, kind: 'delta', delta: -1 }, () => adjustLoss(session.id, id, -1));
    },
    [bump, guard, haptic, lossOf, send, session.id],
  );

  const toggle = useCallback(
    (id: string) => {
      if (!guard()) return;
      const present = isPresent(id);
      if (present && lossOf(id) > 0) {
        toast.error(`${member(id)?.name ?? 'Thành viên'} đang có ${lossOf(id)} trận thua — bấm (−) về 0 trước`);
        haptic(40);
        return;
      }
      haptic();
      send({ memberId: id, kind: 'attend', present: !present }, () => setAttendance(session.id, id, !present));
    },
    [guard, haptic, isPresent, lossOf, member, send, session.id],
  );

  /** Hoàn tác lần (+) gần nhất do chính máy này ghi */
  const undo = useCallback(() => {
    const id = history.at(-1);
    if (!id) return;
    setHistory((h) => h.slice(0, -1));
    if (!lossOf(id)) return;
    haptic();
    bump(id);
    send({ memberId: id, kind: 'delta', delta: -1 }, () => adjustLoss(session.id, id, -1));
  }, [bump, haptic, history, lossOf, send, session.id]);

  const presentIds = useMemo(() => results.map((r) => r.memberId), [results]);
  const totalLosses = useMemo(() => results.reduce((a, r) => a + r.losses, 0), [results]);
  /** Người thua nhiều nhất buổi (được tô cam ở cột thứ hạng) */
  const kingId = useMemo(() => {
    let best: { id: string; l: number } | null = null;
    for (const r of results) if (r.losses > 0 && (!best || r.losses > best.l)) best = { id: r.memberId, l: r.losses };
    return best?.id ?? null;
  }, [results]);

  return { editable, lossOf, isPresent, pendingDelta, inc, dec, toggle, undo, canUndo: history.length > 0, presentIds, totalLosses, kingId, pulse };
}

export type SessionScoring = ReturnType<typeof useSessionScoring>;
