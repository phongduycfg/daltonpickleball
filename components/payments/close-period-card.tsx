'use client';

import { useState } from 'react';
import { Archive, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { closePeriod } from '@/actions/payment';
import type { FundSummary } from '@/lib/settlement';
import type { PaymentsView } from '@/lib/payments-view';
import { periodCode, periodLabel } from '@/lib/dates';
import { vnd } from '@/lib/format';

/** Đóng kỳ: lưu trữ snapshot (xem lại qua ô chọn tháng) và mở kỳ mới */
export function ClosePeriodCard({ view, fund, exportPdf, exporting }: { view: PaymentsView; fund: FundSummary; exportPdf: () => Promise<boolean>; exporting: boolean }) {
  const { period } = useClub();
  const [open, setOpen] = useState(false);
  const [withPdf, setWithPdf] = useState(true);
  const [code, setCode] = useState('');
  const { pending, run } = useServerAction();
  const expected = periodCode(period);
  const label = periodLabel(period);

  async function doClose() {
    if (code.trim().toUpperCase() !== expected) return;
    if (withPdf && !(await exportPdf())) return;
    run(() => closePeriod(period.id, code), { success: `Đã đóng ${label} · mở kỳ mới`, onSuccess: () => setOpen(false) });
  }

  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-live/15 text-[#FCA5A5]">
        <Archive className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">Đóng kỳ {label}</div>
        <div className="text-xs text-slate-400">Lưu trữ, xem lại được · mở kỳ mới</div>
      </div>
      <Button
        variant="danger-outline"
        size="sm"
        className="shrink-0 text-sm"
        onClick={() => {
          setCode('');
          setOpen(true);
        }}
      >
        Đóng kỳ
      </Button>

      <Sheet open={open} onOpenChange={setOpen} title={`Đóng kỳ ${label}?`} description="Dữ liệu được lưu trữ, xem lại trong ô chọn tháng.">
        <div className="space-y-3">
          <ul className="space-y-1.5 rounded-2xl border border-white/[.06] bg-deep p-3 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-400">Buổi chơi</span>
              <b>{view.sessionCount} buổi</b>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Trận thua</span>
              <b>{view.totalLosses} trận</b>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Tổng chi phí</span>
              <b>{vnd(view.totalCost)}</b>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Chưa đóng / chờ xác nhận</span>
              <b>
                {fund.owingCount} / {fund.pendingIds.length} người
              </b>
            </li>
          </ul>
          {fund.owingCount || fund.pendingIds.length ? (
            <p className="flex items-start gap-1.5 text-xs text-warn">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              Còn người chưa đóng — trạng thái được lưu nguyên vào kỳ cũ.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withPdf} onChange={(e) => setWithPdf(e.target.checked)} className="size-5 accent-[#D7F531]" />
            Xuất báo cáo PDF trước
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">
              Gõ <b className="text-white">{expected}</b> để xác nhận
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void doClose()}
              placeholder={expected}
              autoCapitalize="characters"
              autoComplete="off"
              className="field mt-1 uppercase tracking-widest"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="dark" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button variant="danger" disabled={code.trim().toUpperCase() !== expected || exporting || pending} onClick={() => void doClose()}>
              {exporting || pending ? <LoaderCircle className="animate-spin" /> : <Archive />}
              Đóng kỳ
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
