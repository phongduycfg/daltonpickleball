'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, LoaderCircle, Send, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { reportPayment, setPaymentStatus } from '@/actions/payment';
import type { PayStatus } from '@/types/database';
import { periodCode } from '@/lib/dates';
import { vnd } from '@/lib/format';
import { bankName, isBankValid, renderTransferNote, vietQrImageUrl } from '@/lib/vietqr';

export interface QrTarget {
  memberId: string;
  name: string;
  amount: number;
  status: PayStatus;
}

/** Mã VietQR động + thông tin chuyển khoản (copy từng dòng) */
export function VietQrSheet({ target, onOpenChange }: { target: QrTarget | null; onOpenChange: (v: boolean) => void }) {
  const { settings, period, me, member, can } = useClub();
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading');
  const { pending, run } = useServerAction();

  useEffect(() => setImgState('loading'), [target?.memberId, target?.amount]);

  const bank = { bin: settings.bankBin, accountNo: settings.bankAccountNo, owner: settings.bankOwner };
  const valid = isBankValid(bank);
  const note = target ? renderTransferNote(settings.transferSyntax, target.name, periodCode(period)) : '';
  const m = target ? member(target.memberId) : undefined;
  const close = () => onOpenChange(false);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã copy ${label}`);
    } catch {
      toast.error('Trình duyệt chặn copy');
    }
  }

  const rows: [string, string, string | null][] = [
    ['Ngân hàng', bankName(bank.bin), null],
    ['Số tài khoản', bank.accountNo ?? '—', bank.accountNo],
    ['Chủ tài khoản', bank.owner ?? '—', null],
    ['Số tiền', target ? vnd(target.amount) : '', target ? String(target.amount) : null],
    ['Nội dung', note, note],
  ];

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange} title="Thanh toán VietQR">
      {target ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {m ? <MemberAvatar member={m} size="md" /> : null}
            <div className="min-w-0 flex-1 truncate text-lg font-extrabold">{target.name}</div>
            <div className="text-2xl font-extrabold tabular-nums text-lime">{vnd(target.amount)}</div>
          </div>

          {valid ? (
            <div className="relative mx-auto grid aspect-square w-64 place-items-center rounded-3xl bg-white p-2 shadow-[0_0_40px_rgba(215,245,49,.15)]">
              {imgState === 'loading' ? <LoaderCircle className="absolute size-8 animate-spin text-slate-400" aria-hidden /> : null}
              {imgState !== 'error' ? (
                // Ảnh QR sinh động từ img.vietqr.io — không qua bộ tối ưu ảnh của Next
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vietQrImageUrl(bank, target.amount, note)}
                  alt={`Mã VietQR chuyển ${vnd(target.amount)}`}
                  onLoad={() => setImgState('ok')}
                  onError={() => setImgState('error')}
                  className="size-full object-contain"
                />
              ) : (
                <div className="px-4 text-center text-ink">
                  <WifiOff className="mx-auto size-10 text-live" aria-hidden />
                  <div className="mt-2 text-sm font-bold">Không tải được mã QR</div>
                  <div className="text-xs text-slate-600">Chuyển khoản thủ công theo thông tin bên dưới.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-warn/30 bg-warn/10 p-3 text-sm text-orange-200">
              Kế toán chưa cài tài khoản nhận tiền (Quản trị → Cài đặt tính tiền).
            </div>
          )}

          {rows.map(([label, value, copyValue]) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-deep px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400">{label}</div>
                <div className="truncate font-bold tabular-nums">{value}</div>
              </div>
              {copyValue ? (
                <button type="button" onClick={() => void copy(copyValue, label.toLowerCase())} className="press grid size-9 place-items-center rounded-xl bg-card2" aria-label={`Copy ${label}`}>
                  <Copy className="size-4" />
                </button>
              ) : null}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="dark" onClick={close}>
              Đóng
            </Button>
            {target.memberId === me.id && target.status === 'none' ? (
              <Button variant="lime" disabled={pending} onClick={() => run(() => reportPayment(period.id), { success: 'Đã báo chuyển khoản · chờ Kế toán xác nhận', onSuccess: close })}>
                <Send />
                Tôi đã chuyển
              </Button>
            ) : null}
            {target.memberId !== me.id && can.finance && target.status !== 'done' ? (
              <Button variant="lime" disabled={pending} onClick={() => run(() => setPaymentStatus(period.id, target.memberId, 'done'), { success: `Đã xác nhận ${target.name}`, onSuccess: close })}>
                <Check strokeWidth={3} />
                Xác nhận đã nhận
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
