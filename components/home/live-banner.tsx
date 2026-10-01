'use client';

import { X } from 'lucide-react';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import { useRealtime } from '@/components/providers/realtime-provider';
import { useNow } from '@/hooks/use-now';
import { timeAgo } from '@/lib/dates';

/** Banner khi máy khác vừa ghi trận thua (đến từ Supabase Realtime) */
export function LiveBanner() {
  const { banner, dismissBanner } = useRealtime();
  const { member } = useClub();
  const now = useNow(15_000, !!banner);
  if (!banner) return null;
  const actor = member(banner.actorId);

  return (
    <div
      key={banner.id}
      className="flex items-center gap-3 rounded-2xl border border-lime/50 bg-[linear-gradient(90deg,rgba(215,245,49,.08),rgba(15,26,44,.9))] px-3.5 py-3 shadow-[0_0_24px_rgba(215,245,49,.12)] animate-in fade-in slide-in-from-top-2"
      role="status"
    >
      {actor ? <MemberAvatar member={actor} size="sm" /> : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-snug">{banner.text}</div>
        <div className="text-xs text-slate-400">{timeAgo(banner.at, now ?? banner.at)}</div>
      </div>
      <button type="button" onClick={dismissBanner} className="press grid size-9 place-items-center text-lime" aria-label="Đóng thông báo">
        <X className="size-5" strokeWidth={2.6} />
      </button>
    </div>
  );
}
