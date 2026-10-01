'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useLocalPref } from '@/hooks/use-local-pref';
import { useClub } from './club-provider';

/**
 * Đồng bộ realtime: lắng nghe thay đổi Postgres (Supabase Realtime, đã áp RLS)
 * → làm mới dữ liệu Server Component (debounce) và hiện banner khi máy khác ghi trận thua.
 */
export interface LiveBanner {
  id: number;
  actorId: string;
  text: string;
  at: number;
}

interface RealtimeContextValue {
  connected: boolean;
  banner: LiveBanner | null;
  dismissBanner: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({ connected: false, banner: null, dismissBanner: () => undefined });

const TABLES = ['session_results', 'sessions', 'payments', 'ledger_items', 'period_exclusions', 'periods', 'profiles', 'venues', 'club_settings'] as const;
const REFRESH_DEBOUNCE_MS = 350;

type ResultRow = { member_id?: string; losses?: number; updated_by?: string | null };

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { me, member } = useClub();
  const [bannerEnabled] = useLocalPref('banner', true);
  const [connected, setConnected] = useState(false);
  const [banner, setBanner] = useState<LiveBanner | null>(null);

  // Giữ giá trị mới nhất trong ref để không phải đăng ký lại kênh mỗi lần render
  const latest = useRef({ meId: me.id, member, bannerEnabled });
  latest.current = { meId: me.id, member, bannerEnabled };

  const timer = useRef<number | undefined>(undefined);
  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const supabase = getBrowserClient();
    let channel = supabase.channel('club-live');

    for (const table of TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        scheduleRefresh();
        if (table !== 'session_results' || payload.eventType === 'DELETE') return;

        const next = payload.new as ResultRow;
        const prev = payload.old as ResultRow;
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
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [scheduleRefresh]);

  const dismissBanner = useCallback(() => setBanner(null), []);

  return <RealtimeContext.Provider value={{ connected, banner, dismissBanner }}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
