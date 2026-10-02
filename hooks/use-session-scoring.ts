'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Session } from '@/types/app';
import { useClub } from '@/components/providers/club-provider';
import { useRealtime } from '@/components/providers/realtime-provider';
import { rpcAdjustLoss, rpcSetAttendance } from '@/lib/scoring-client';
import { useHaptics } from './use-haptics';

/** Giá trị ghi đè cục bộ: số trận thua, hoặc null = vắng */
type Override = number | null;

/**
 * Logic ghi kèo cho 1 buổi — phản hồi tức thì, không chờ mạng:
 * - Giao diện hiển thị = dữ liệu server + "ghi đè cục bộ" (thao tác của mình + realtime từ máy khác).
 * - Mỗi thao tác gọi thẳng RPC Postgres; các thao tác trên CÙNG 1 người được xếp hàng tuần tự
 *   để kết quả trả về luôn đúng thứ tự (bấm (+) liên tục không bị nhảy số).
 * - Lỗi → báo lỗi và tải lại dữ liệu chuẩn từ server.
 * Quy tắc: chạm tên = có mặt (0) ↔ vắng; không đánh vắng khi còn trận thua; (+) tự đánh dấu có mặt.
 */
export function useSessionScoring(session: Session) {
  const { can, member } = useClub();
  const { subscribeResults } = useRealtime();
  const router = useRouter();
  const haptic = useHaptics();

  const [overrides, setOverrides] = useState<ReadonlyMap<string, Override>>(() => new Map());
  const [history, setHistory] = useState<string[]>([]);
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);

  /** Hàng đợi tuần tự theo từng thành viên + số thao tác đang chờ */
  const queues = useRef(new Map<string, Promise<void>>());
  const pending = useRef(new Map<string, number>());

  const server = useMemo(() => new Map(session.results.map((r) => [r.memberId, r.losses])), [session.results]);

  // Dữ liệu server mới về → bỏ các ghi đè đã khớp (giữ lại ghi đè của thao tác đang chờ)
  useEffect(() => {
    setOverrides((prev) => {
      if (!prev.size) return prev;
      const next = new Map(prev);
      for (const [id, v] of prev) {
        if ((pending.current.get(id) ?? 0) > 0) continue;
        const s = server.has(id) ? (server.get(id) as number) : null;
        if (s === v) next.delete(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [server]);

  const setOverride = useCallback((id: string, v: Override) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, v);
      return next;
    });
  }, []);

  // Thay đổi từ máy khác (hoặc phản hồi của chính mình) qua Realtime
  useEffect(
    () =>
      subscribeResults((c) => {
        if (c.sessionId !== session.id) return;
        // Đang có thao tác của mình chờ xử lý → giá trị cục bộ là mới nhất, bỏ qua sự kiện cũ
        if ((pending.current.get(c.memberId) ?? 0) > 0) return;
        setOverride(c.memberId, c.losses);
      }),
    [subscribeResults, session.id, setOverride],
  );

  const current = useCallback(
    (id: string): Override => {
      if (overrides.has(id)) return overrides.get(id) ?? null;
      return server.has(id) ? (server.get(id) as number) : null;
    },
    [overrides, server],
  );

  const editable = can.score && session.status !== 'scheduled';
  const lossOf = useCallback((id: string) => current(id) ?? 0, [current]);
  const isPresent = useCallback((id: string) => current(id) !== null, [current]);
  /** Chênh lệch giữa giá trị đang hiển thị và giá trị server (để cộng vào tổng tháng) */
  const pendingDelta = useCallback((id: string) => (current(id) ?? 0) - (server.get(id) ?? 0), [current, server]);

  const guard = useCallback((): boolean => {
    if (editable) return true;
    toast.error(session.status === 'scheduled' ? 'Buổi chưa bắt đầu' : 'Cần quyền Ghi kèo');
    return false;
  }, [editable, session.status]);

  /** Xếp hàng 1 lời gọi RPC cho thành viên; onDone nhận giá trị chuẩn từ server */
  const enqueue = useCallback(
    (id: string, call: () => Promise<{ ok: true; value: Override } | { ok: false; error: string }>) => {
      pending.current.set(id, (pending.current.get(id) ?? 0) + 1);
      const prev = queues.current.get(id) ?? Promise.resolve();
      const run = prev.then(async () => {
        const res = await call();
        const left = (pending.current.get(id) ?? 1) - 1;
        pending.current.set(id, left);
        if (!res.ok) {
          toast.error(res.error);
          haptic(40);
          // Huỷ toàn bộ giá trị tạm của người này và lấy lại dữ liệu chuẩn
          setOverrides((p) => {
            const next = new Map(p);
            next.delete(id);
            return next;
          });
          router.refresh();
          return;
        }
        if (left === 0) setOverride(id, res.value);
      });
      queues.current.set(id, run);
    },
    [haptic, router, setOverride],
  );

  const bump = useCallback((id: string) => setPulse((p) => ({ id, n: (p?.n ?? 0) + 1 })), []);

  const inc = useCallback(
    (id: string) => {
      if (!guard()) return;
      haptic(18);
      bump(id);
      setHistory((h) => [...h, id]);
      setOverride(id, (current(id) ?? 0) + 1);
      enqueue(id, async () => {
        const r = await rpcAdjustLoss(session.id, id, 1);
        return r.ok ? { ok: true, value: r.losses } : r;
      });
    },
    [bump, current, enqueue, guard, haptic, session.id, setOverride],
  );

  const dec = useCallback(
    (id: string, fromUndo = false) => {
      if (!guard() || !lossOf(id)) return;
      haptic();
      bump(id);
      if (!fromUndo) {
        setHistory((h) => {
          const i = h.lastIndexOf(id);
          return i < 0 ? h : [...h.slice(0, i), ...h.slice(i + 1)];
        });
      }
      setOverride(id, lossOf(id) - 1);
      enqueue(id, async () => {
        const r = await rpcAdjustLoss(session.id, id, -1);
        return r.ok ? { ok: true, value: r.losses } : r;
      });
    },
    [bump, enqueue, guard, haptic, lossOf, session.id, setOverride],
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
      setOverride(id, present ? null : 0);
      enqueue(id, async () => {
        const r = await rpcSetAttendance(session.id, id, !present);
        return r.ok ? { ok: true, value: present ? null : 0 } : r;
      });
    },
    [enqueue, guard, haptic, isPresent, lossOf, member, session.id, setOverride],
  );

  /** Hoàn tác lần (+) gần nhất do chính máy này ghi */
  const undo = useCallback(() => {
    const id = history.at(-1);
    if (!id) return;
    setHistory((h) => h.slice(0, -1));
    dec(id, true);
  }, [dec, history]);

  const presentIds = useMemo(() => {
    const ids = new Set(session.results.map((r) => r.memberId));
    for (const [id, v] of overrides) {
      if (v === null) ids.delete(id);
      else ids.add(id);
    }
    return [...ids];
  }, [overrides, session.results]);

  const totalLosses = useMemo(() => presentIds.reduce((a, id) => a + lossOf(id), 0), [presentIds, lossOf]);

  /** Người thua nhiều nhất buổi (được tô cam ở cột thứ hạng) */
  const kingId = useMemo(() => {
    let best: { id: string; l: number } | null = null;
    for (const id of presentIds) {
      const l = lossOf(id);
      if (l > 0 && (!best || l > best.l)) best = { id, l };
    }
    return best?.id ?? null;
  }, [presentIds, lossOf]);

  return { editable, lossOf, isPresent, pendingDelta, inc, dec, toggle, undo, canUndo: history.length > 0, presentIds, totalLosses, kingId, pulse };
}

export type SessionScoring = ReturnType<typeof useSessionScoring>;
