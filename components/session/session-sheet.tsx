'use client';

import { useEffect, useState } from 'react';
import { Coins, Flag, Play, RotateCcw } from 'lucide-react';
import type { Session } from '@/types/app';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SessionStatusPill } from '@/components/shared/session-status';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import type { SessionScoring } from '@/hooks/use-session-scoring';
import { cancelSession, endSession, reopenSession, startSession, updateSessionCost } from '@/actions/session';
import { formatAmountInput, parseAmountInput } from '@/lib/format';
import { sessionTitle } from '@/lib/session-view';
import { LossList } from './loss-list';

/** Chi tiết 1 buổi: chi phí sân + nước, ghi kèo đầy đủ, bắt đầu / kết thúc / mở lại / huỷ */
export function SessionSheet({
  session,
  scoring,
  monthTotals,
  open,
  onOpenChange,
}: {
  session: Session;
  scoring: SessionScoring;
  monthTotals: Record<string, number>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { can, venue } = useClub();
  const [cost, setCost] = useState(session.cost);
  const { pending, run } = useServerAction();

  // Đồng bộ khi server trả về giá trị mới (realtime hoặc máy khác sửa)
  useEffect(() => setCost(session.cost), [session.cost]);

  const v = venue(session.venueId);
  const dirty = cost !== session.cost;
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={sessionTitle(session)} description={v?.name ?? 'Sân đã xoá'}>
      <div className="space-y-3">
        <SessionStatusPill status={session.status} />

        <div className="rounded-2xl border border-white/[.06] bg-deep p-3">
          <label htmlFor={`cost-${session.id}`} className="text-xs text-slate-400">
            Chi phí sân + nước · Kế toán chi
          </label>
          <div className="mt-1 flex items-center gap-2">
            <Coins className="size-6 text-lime" aria-hidden />
            <input
              id={`cost-${session.id}`}
              type="text"
              inputMode="numeric"
              value={formatAmountInput(cost)}
              onChange={(e) => setCost(parseAmountInput(e.target.value))}
              disabled={!can.cost}
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold tabular-nums focus:outline-none disabled:opacity-70"
            />
            <span className="font-bold text-slate-400">đ</span>
          </div>
          {dirty ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button size="sm" variant="dark" onClick={() => setCost(session.cost)}>
                Hoàn lại
              </Button>
              <Button size="sm" variant="lime" disabled={pending} onClick={() => run(() => updateSessionCost(session.id, cost), { success: 'Đã lưu chi phí' })}>
                Lưu chi phí
              </Button>
            </div>
          ) : null}
        </div>

        {session.status !== 'scheduled' ? (
          <div className="overflow-hidden rounded-2xl border border-white/[.07] bg-card">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <span className="font-semibold">
                {scoring.presentIds.length} có mặt · {scoring.totalLosses} trận thua
              </span>
              <span className="text-xs text-slate-400">Chạm tên để điểm danh</span>
            </div>
            <LossList scoring={scoring} monthTotals={monthTotals} />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[.06] bg-deep p-4 text-sm text-slate-300">
            Buổi chưa bắt đầu. Khi ra sân, bấm <b className="text-white">Bắt đầu buổi</b> để điểm danh và ghi trận thua.
          </div>
        )}

        {can.score ? (
          <div className="grid grid-cols-2 gap-2">
            {session.status === 'live' ? (
              <Button variant="lime" className="col-span-2" disabled={pending} onClick={() => run(() => endSession(session.id), { success: 'Đã kết thúc buổi', onSuccess: close })}>
                <Flag className="size-5" />
                Kết thúc buổi
              </Button>
            ) : null}
            {session.status === 'closed' ? (
              <>
                <Button variant="dark" disabled={pending} onClick={() => run(() => reopenSession(session.id), { success: 'Đã mở lại buổi' })}>
                  <RotateCcw />
                  Mở lại buổi
                </Button>
                <Button variant="lime" onClick={close}>
                  Xong
                </Button>
              </>
            ) : null}
            {session.status === 'scheduled' ? (
              <>
                <Button variant="dark" className="!text-[#FCA5A5]" disabled={pending} onClick={() => run(() => cancelSession(session.id), { success: 'Đã huỷ lịch', onSuccess: close })}>
                  Huỷ lịch
                </Button>
                <Button variant="lime" disabled={pending} onClick={() => run(() => startSession(session.id), { success: 'Đã bắt đầu buổi' })}>
                  <Play className="size-5" />
                  Bắt đầu buổi
                </Button>
              </>
            ) : null}
          </div>
        ) : (
          <Button variant="lime" className="w-full" onClick={close}>
            Đóng
          </Button>
        )}
      </div>
    </Sheet>
  );
}
