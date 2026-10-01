'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, QrCode, Send, Wallet } from 'lucide-react';
import type { PayStatus } from '@/types/database';
import type { FundSummary, SettlementRow } from '@/lib/settlement';
import { paymentLabel } from '@/lib/settlement';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { reportPayment } from '@/actions/payment';
import { PAY_TONE } from '@/components/payments/pay-status';
import { VietQrSheet, type QrTarget } from '@/components/payments/vietqr-sheet';
import { shortMoney, vnd } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Thẻ "Tôi kỳ này": phải gánh · đã ứng · còn đóng + nút Thanh toán / Tôi đã chuyển */
export function WalletCard({ row, status }: { row: SettlementRow; status: PayStatus }) {
  const { me, period } = useClub();
  const [qr, setQr] = useState<QrTarget | null>(null);
  const { pending, run } = useServerAction();
  const label = paymentLabel(row, status);
  const tone = PAY_TONE[label.tone];
  const receive = row.net < 0;
  const remaining = status === 'done' ? 0 : Math.abs(row.net);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <MemberAvatar member={me} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Tôi kỳ này</div>
          <div className="text-xs text-slate-400">
            {row.sessions} buổi · {row.losses} trận thua
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn('text-xl font-extrabold tabular-nums', receive ? 'text-emerald-300' : 'text-lime')}>{vnd(remaining)}</div>
          <div className={cn('flex items-center justify-end gap-1 text-xs font-semibold', tone.className)}>
            <tone.icon className="size-3.5" aria-hidden />
            {label.label}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 rounded-2xl border border-white/[.06] bg-deep py-2.5 text-center">
        <div>
          <div className="text-xs text-slate-400">Phải gánh</div>
          <div className="font-bold tabular-nums">{shortMoney(row.burden)}</div>
        </div>
        <div className="border-x border-white/[.07]">
          <div className="text-xs text-slate-400">Đã ứng</div>
          <div className="font-bold tabular-nums">{shortMoney(row.advanced)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{receive ? 'Nhận lại' : 'Còn đóng'}</div>
          <div className={cn('font-bold tabular-nums', receive ? 'text-emerald-300' : 'text-lime')}>{shortMoney(remaining)}</div>
        </div>
      </div>

      {row.net > 0 && status === 'none' ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="lime" onClick={() => setQr({ memberId: me.id, name: me.name, amount: row.net, status })}>
            <QrCode className="size-5" />
            Thanh toán
          </Button>
          <Button variant="dark" disabled={pending} onClick={() => run(() => reportPayment(period.id), { success: 'Đã báo chuyển khoản · chờ Kế toán xác nhận' })}>
            <Send className="size-5" />
            Tôi đã chuyển
          </Button>
        </div>
      ) : null}
      {status === 'pending' && row.net > 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-200">
          <Clock className="size-4" aria-hidden />
          Đã báo chuyển khoản · chờ Kế toán xác nhận.
        </div>
      ) : null}

      <VietQrSheet target={qr} onOpenChange={(v) => !v && setQr(null)} />
    </div>
  );
}

/** Thẻ quỹ cho Kế toán (thay cho "Tôi kỳ này") */
export function FundCard({ fund }: { fund: FundSummary }) {
  const pendingPct = fund.toCollect ? (fund.pendingSum / fund.toCollect) * 100 : 0;
  return (
    <Link href="/payments" className="press card block w-full p-4 text-left">
      <div className="flex items-center gap-3">
        <span className="icon-bubble size-11">
          <Wallet className="size-6" aria-hidden />
        </span>
        <div className="flex-1">
          <div className="text-[15px] font-semibold">Quỹ kỳ này</div>
          <div className="text-xs text-slate-400">
            {fund.owingCount} người chưa đóng · {fund.pendingIds.length} chờ xác nhận
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-lime">{fund.percent}%</div>
          <div className="text-xs text-slate-400">đã thu</div>
        </div>
      </div>
      <FundBar percent={fund.percent} pendingPercent={pendingPct} />
    </Link>
  );
}

/** Thanh tiến độ thu quỹ: lime = đã thu · xanh = chờ xác nhận */
export function FundBar({ percent, pendingPercent }: { percent: number; pendingPercent: number }) {
  return (
    <div
      className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Tiến độ thu quỹ"
    >
      <div className="h-full bg-lime transition-all" style={{ width: `${percent}%` }} />
      <div className="h-full bg-sky-400/70 transition-all" style={{ width: `${pendingPercent}%` }} />
    </div>
  );
}
