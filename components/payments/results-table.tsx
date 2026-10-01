'use client';

import { useState } from 'react';
import { ChartColumn, Check, Download, HandCoins, LoaderCircle, QrCode, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { reportPayment, setPaymentStatus } from '@/actions/payment';
import type { PayRowView } from '@/lib/payments-view';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PAY_TONE } from './pay-status';
import { VietQrSheet, type QrTarget } from './vietqr-sheet';

const RANK_BADGE = ['bg-[#FACC15] text-ink', 'bg-[#E2E8F0] text-ink', 'bg-[#F59E5B] text-ink'];

/** Bảng kết quả theo thành viên — chạm 1 dòng để xem chi tiết và thao tác thanh toán */
export function ResultsTable({
  rows,
  isCurrent,
  exporting,
  onExport,
}: {
  rows: PayRowView[];
  isCurrent: boolean;
  exporting: boolean;
  onExport: () => void;
}) {
  const { me, member, period, can } = useClub();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qr, setQr] = useState<QrTarget | null>(null);
  const { pending, run } = useServerAction();
  const setStatus = (id: string, status: 'none' | 'pending' | 'done', success: string) => run(() => setPaymentStatus(period.id, id, status), { success });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2.5 p-4">
        <ChartColumn className="size-5" aria-hidden />
        <span className="flex-1 text-[15px] font-semibold leading-tight">Kết quả theo thành viên</span>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="press flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-card2 px-3 text-sm disabled:opacity-60"
        >
          {exporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          {exporting ? 'Đang xuất' : 'Xuất file'}
        </button>
      </div>

      <div className="grid h-10 grid-cols-[30px_1fr_48px_96px] items-center gap-1 border-y border-white/[.07] bg-deep/60 px-3 text-[11px] font-semibold text-slate-300">
        <span className="text-center">#</span>
        <span className="pl-9">Thành viên</span>
        <span className="text-center leading-tight">Trận thua</span>
        <span className="text-right leading-tight">Phải trả</span>
      </div>

      {rows.map((r, i) => {
        const m = member(r.memberId);
        const open = expanded === r.memberId;
        const mine = isCurrent && r.memberId === me.id;
        const tone = PAY_TONE[r.tone];
        return (
          <div key={r.memberId} className="border-b border-white/[.06] last:border-0">
            <button
              type="button"
              onClick={() => setExpanded(open ? null : r.memberId)}
              aria-expanded={open}
              className={cn('grid w-full grid-cols-[30px_1fr_48px_96px] items-center gap-1 px-3 py-2 text-left', mine && 'bg-lime/[.04]')}
            >
              <span className={cn('mx-auto grid size-6 place-items-center rounded-full text-xs font-bold', RANK_BADGE[i] ?? 'bg-card2 text-slate-200')}>{i + 1}</span>
              <span className="flex min-w-0 items-center gap-2">
                <MemberAvatar member={m ?? { id: r.memberId, name: r.name, avatarUrl: null }} size="xs" />
                <span className="min-w-0">
                  <span className="block truncate text-sm">
                    {r.name}
                    {mine ? ' (bạn)' : ''}
                  </span>
                  <span className={cn('block truncate text-[11px]', tone.className)}>{r.label}</span>
                </span>
              </span>
              <span className="text-center text-sm font-bold">{r.losses}</span>
              <span
                className={cn(
                  'text-right text-sm font-bold tabular-nums',
                  r.isAccountant ? 'text-sky-300' : r.net < 0 ? 'text-emerald-300' : r.status === 'done' ? 'text-slate-500 line-through' : '',
                )}
              >
                {r.isAccountant ? 'Thủ quỹ' : `${r.net < 0 ? '+' : ''}${vnd(Math.abs(r.net))}`}
              </span>
            </button>

            {open ? (
              <div className="px-3 pb-3 animate-in fade-in">
                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 rounded-2xl border border-white/[.06] bg-deep px-3 py-2.5 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">Phải gánh</div>
                    <div className="text-sm font-bold tabular-nums">{vnd(r.burden)}</div>
                  </div>
                  <span className="text-slate-500">−</span>
                  <div>
                    <div className="text-[11px] text-slate-400">Đã ứng</div>
                    <div className="text-sm font-bold tabular-nums">{vnd(r.advanced)}</div>
                  </div>
                  <span className="text-slate-500">=</span>
                  <div>
                    <div className="text-[11px] text-slate-400">{r.net < 0 ? 'Nhận lại' : 'Phải trả'}</div>
                    <div className={cn('text-sm font-extrabold tabular-nums', r.net < 0 ? 'text-emerald-300' : 'text-lime')}>{vnd(Math.abs(r.net))}</div>
                  </div>
                </div>

                {isCurrent && !r.isAccountant ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {r.net > 0 && r.status !== 'done' ? (
                      <Button variant="lime" onClick={() => setQr({ memberId: r.memberId, name: r.name, amount: r.net, status: r.status })}>
                        <QrCode />
                        Thanh toán
                      </Button>
                    ) : null}
                    {r.net > 0 && r.status === 'none' && r.memberId === me.id ? (
                      <Button variant="dark" disabled={pending} onClick={() => run(() => reportPayment(period.id), { success: 'Đã báo chuyển khoản · chờ Kế toán xác nhận' })}>
                        <Send />
                        Tôi đã chuyển
                      </Button>
                    ) : null}
                    {r.net > 0 && r.status !== 'done' && can.finance ? (
                      <Button variant="dark" disabled={pending} onClick={() => setStatus(r.memberId, 'done', `Đã xác nhận ${r.name}`)}>
                        <Check />
                        Xác nhận
                      </Button>
                    ) : null}
                    {r.net > 0 && r.status === 'done' && can.finance ? (
                      <Button variant="dark" className="col-span-2" disabled={pending} onClick={() => setStatus(r.memberId, 'none', 'Đã huỷ trạng thái đã đóng')}>
                        Huỷ trạng thái đã đóng
                      </Button>
                    ) : null}
                    {r.net < 0 && can.finance ? (
                      <Button
                        variant="dark"
                        className="col-span-2"
                        disabled={pending}
                        onClick={() =>
                          r.status === 'done'
                            ? setStatus(r.memberId, 'none', 'Đã huỷ trạng thái trả lại')
                            : setStatus(r.memberId, 'done', `Đã trả lại ${vnd(-r.net)} cho ${r.name}`)
                        }
                      >
                        <HandCoins />
                        {r.status === 'done' ? 'Huỷ đã trả lại' : 'Đánh dấu đã trả lại'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {!rows.length ? <div className="p-6 text-center text-sm text-slate-400">Chưa có dữ liệu trong kỳ.</div> : null}

      <VietQrSheet target={qr} onOpenChange={(v) => !v && setQr(null)} />
    </div>
  );
}
