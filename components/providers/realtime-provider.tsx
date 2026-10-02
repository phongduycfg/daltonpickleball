'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useLocalPref } from '@/hooks/use-local-pref';
import { useClub } from './club-provider';

/**
 * Đồng bộ realtime (Supabase Realtime, đã áp RLS).
 *
 * - Ghi kèo (session_results): thay đổi được ĐẨY THẲNG vào giao diện qua `subscribeResults`
 *   → các máy khác thấy số trận thua nhảy ngay, không phải tải lại trang.
 *   Các số liệu phụ thuộc (tổng kỳ, tiền) được làm mới gộp sau vài giây.
 * - Bảng khác (thanh toán, thu chi, lịch…): ít thay đổi → làm mới dữ liệu server (debounce).
 */
export interface LiveBanner {
  id: number;
  actorId: string;
  text: string;
  at: number;
}

/** 1 thay đổi kết quả: losses = null nghĩa là thành viên bị đánh vắng (xoá dòng) */
export interface ResultChange {
  sessionId: string;
  memberId: string;
  losses: number | null;
}

type ResultListener = (c: ResultChange) => void;

interface RealtimeContextValue {
  connected: boolean;
  banner: LiveBanner | null;
  dismissBanner: () => void;
  subscribeResults: (fn: ResultListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  banner: null,
  dismissBanner: () => undefined,
  subscribeResults: () => () => undefined,
});

const TABLES = ['session_results', 'sessions', 'payments', 'ledger_items', 'period_exclusions', 'periods', 'profiles', 'venues', 'club_settings'] as const;
/** Bảng thường: làm mới nhanh */
const REFRESH_FAST_MS = 400;
/** Ghi kèo: điểm số đã cập nhật tức thì, chỉ gộp làm mới tổng/tiền → chờ lâu hơn để tránh tải lại liên tục */
const REFRESH_SCORING_MS = 2500;

type ResultRow = { session_id?: string; member_id?: string; losses?: number; updated_by?: string | null };

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { me, member } = useClub();
  const [bannerEnabled] = useLocalPref('banner', true);
  const [connected, setConnected] = useState(false);
  const [banner, setBanner] = useState<LiveBanner | null>(null);
  const listeners = useRef(new Set<ResultListener>());

  // Giữ giá trị mới nhất trong ref để không phải đăng ký lại kênh mỗi lần render
  const latest = useRef({ meId: me.id, member, bannerEnabled });
  latest.current = { meId: me.id, member, bannerEnabled };

  const timer = useRef<number | undefined>(undefined);
  const due = useRef<number>(0);
  const scheduleRefresh = useCallback(
    (delay: number) => {
      const at = Date.now() + delay;
      // Đã có lịch làm mới sớm hơn → giữ nguyên
      if (timer.current !== undefined && due.current <= at) return;
      window.clearTimeout(timer.current);
      due.current = at;
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        router.refresh();
      }, delay);
    },
    [router],
  );

  useEffect(() => {
    const supabase = getBrowserClient();
    let channel = supabase.channel('club-live');

    for (const table of TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (table !== 'session_results') {
          scheduleRefresh(REFRESH_FAST_MS);
          return;
        }
        scheduleRefresh(REFRESH_SCORING_MS);

        const next = payload.new as ResultRow;
        const prev = payload.old as ResultRow;
        const row = payload.eventType === 'DELETE' ? prev : next;
        if (row.session_id && row.member_id) {
          const change: ResultChange = {
            sessionId: row.session_id,
            memberId: row.member_id,
            losses: payload.eventType === 'DELETE' ? null : (next.losses ?? 0),
          };
          listeners.current.forEach((fn) => fn(change));
        }

        if (payload.eventType === 'DELETE') return;
        const { meId, member: find, bannerEnabled: show } = latest.current;
        if (!show || !next.updated_by || next.updated_by === meId || !next.member_id) return;
        if ((next.losses ?? 0) <= (prev.losses ?? 0)) return;
        const actor = find(next.updated_by);
        const target = find(next.member_id);
        if (!actor || !target) return;
        setBanner({ id: Date.now(), actorId: actor.id, text: `${actor.name} vừa ghi 1 trận thua cho ${target.name}`, at: Date.now() });
      });
    }

    channel.subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    // Quay lại ứng dụng sau khi khoá màn hình → lấy dữ liệu mới (có thể đã lỡ sự kiện)
    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh(REFRESH_FAST_MS);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearTimeout(timer.current);
      timer.current = undefined;
      void supabase.removeChannel(channel);
    };
  }, [scheduleRefresh]);

  const dismissBanner = useCallback(() => setBanner(null), []);
  const subscribeResults = useCallback((fn: ResultListener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value = useMemo(() => ({ connected, banner, dismissBanner, subscribeResults }), [connected, banner, dismissBanner, subscribeResults]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
