'use client';

import { Check } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import type { SessionScoring } from '@/hooks/use-session-scoring';
import { cn } from '@/lib/utils';

/** Điểm danh nhanh dạng lưới 3 cột */
export function AttendanceSheet({ open, onOpenChange, scoring }: { open: boolean; onOpenChange: (v: boolean) => void; scoring: SessionScoring }) {
  const { members } = useClub();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Thêm thành viên vào buổi" description={`${scoring.presentIds.length}/${members.length} có mặt`}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {members.map((m) => {
            const on = scoring.isPresent(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => scoring.toggle(m.id)}
                aria-pressed={on}
                className={cn(
                  'press relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition',
                  on ? 'border-lime/50 bg-lime/10' : 'border-white/10 bg-card opacity-60',
                )}
              >
                <MemberAvatar member={m} size="md" dim={!on} />
                <span className="w-full truncate text-center text-sm font-semibold">{m.name}</span>
                <span className={cn('absolute right-2 top-2 grid size-5 place-items-center rounded-md', on ? 'bg-lime text-ink' : 'border border-slate-500')}>
                  {on ? <Check className="size-3.5" strokeWidth={3.5} /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <Button variant="lime" className="w-full" onClick={() => onOpenChange(false)}>
          Xong
        </Button>
      </div>
    </Sheet>
  );
}
