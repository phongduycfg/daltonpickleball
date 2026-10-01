'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ClubSettings, CurrentMember, Member, Period, Venue } from '@/types/app';
import { canEditCost, canFinance, canScore } from '@/lib/constants';

/**
 * Ngữ cảnh CLB phía client: người dùng hiện tại, thành viên, sân, cấu hình và kỳ đang mở.
 * Dữ liệu đến từ Server Component (layout) — client không tự truy vấn.
 */
interface ClubContextValue {
  me: CurrentMember;
  members: Member[];
  venues: Venue[];
  settings: ClubSettings;
  period: Period;
  accountantId: string | null;
  member: (id: string) => Member | undefined;
  venue: (id: string) => Venue | undefined;
  can: { score: boolean; finance: boolean; cost: boolean; admin: boolean };
}

const ClubContext = createContext<ClubContextValue | null>(null);

export function ClubProvider({
  children,
  ...value
}: Omit<ClubContextValue, 'member' | 'venue' | 'can'> & { children: ReactNode }) {
  const { me, members, venues, settings, period, accountantId } = value;
  const ctx = useMemo<ClubContextValue>(() => {
    const byId = new Map(members.map((m) => [m.id, m]));
    const venueById = new Map(venues.map((v) => [v.id, v]));
    return {
      me,
      members,
      venues,
      settings,
      period,
      accountantId,
      member: (id) => byId.get(id),
      venue: (id) => venueById.get(id),
      can: { score: canScore(me.role), finance: canFinance(me.role), cost: canEditCost(me.role), admin: me.role === 'admin' },
    };
  }, [me, members, venues, settings, period, accountantId]);
  return <ClubContext.Provider value={ctx}>{children}</ClubContext.Provider>;
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub phải nằm trong <ClubProvider>');
  return ctx;
}
