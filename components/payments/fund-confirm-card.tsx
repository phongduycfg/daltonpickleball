'use client';

import { Check, Clock, Wallet, X } from 'lucide-react';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { FundBar } from '@/components/home/wallet-card';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { setPaymentStatus } from '@/actions/payment';
import type { FundSummary } from '@/lib/settlement';
import type { PayRowView } from '@/lib/payments-view';
import { periodCode } from '@/lib/dates';
import { vnd } from '@/lib/format';
import { renderTransferNote } from '@/lib/vietqr';

/** Quỹ do Kế toán giữ + danh sách chờ xác nhận chuyển khoản */
export function FundConfirmCard({ fund, rows }: { fund: FundSummary; rows: PayRowView[] }) {
  const { member, accountantId, period, settings } = useClub();
  const { pending, run } = useServerAction();
  const accountant = accountantId ? member(accountantId) : undefined;
  const waiting = rows.filter((r) => fund.pendingIds.includes(r.memberId));
  const pendingPct = fund.toCollect ? (fund.pendingSum / fund.toCollect) * 100 : 0;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className="icon-bubble size-9">
          <Wallet className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">Quỹ · Kế toán {accountant?.name ?? '—'}</div>
          <div className="text-xs text-slate-400">
            Đang ứng <b className="text-white">{vnd(fund.advanced)}</b>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-lime">{fund.percent}%</div>
          <div className="text-xs text-slate-400">đã thu</div>
        </div>
      </div>
      <FundBar percent={fund.percent} pendingPercent={pendingPct} />
      <div className="mt-1.5 flex justify-between text-xs text-slate-400">
        <span>Đã thu {vnd(fund.collected)}</span>
        <span>Cần thu {vnd(fund.toCollect)}</span>
      </div>

      {waiting.length ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300">
            <Clock className="size-4" aria-hidden />
            Chờ xác nhận ({waiting.length})
          </div>
          {waiting.map((r) => {
            const m = member(r.memberId);
            return (
              <div key={r.memberId} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-deep p-2.5">
                {m ? <MemberAvatar member={m} size="sm" /> : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="truncate text-xs text-slate-400">ND: {renderTransferNote(settings.transferSyntax, r.name, periodCode(period))}</div>
                </div>
                <span className="text-sm font-bold tabular-nums">{vnd(r.net)}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setPaymentStatus(period.id, r.memberId, 'none'), { success: `Đã báo ${r.name}: chưa thấy tiền` })}
                  className="press grid size-9 place-items-center rounded-xl border border-white/10 bg-card2"
                  aria-label={`Chưa thấy tiền của ${r.name}`}
                >
                  <X className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setPaymentStatus(period.id, r.memberId, 'done'), { success: `Đã xác nhận ${r.name}` })}
                  className="press grid size-9 place-items-center rounded-xl bg-lime text-ink"
                  aria-label={`Xác nhận đã nhận tiền của ${r.name}`}
                >
                  <Check className="size-4" strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
