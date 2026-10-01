'use client';

import { useState } from 'react';
import { Gift, Plus, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/shared/money-input';
import { SelectField } from '@/components/shared/select-field';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { addLedgerItem, removeLedgerItem } from '@/actions/payment';
import type { PayItemView } from '@/lib/payments-view';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Danh sách khoản thu/chi khác (dùng cả trong thẻ Thanh toán và sheet Quản trị) */
export function LedgerList({ items, editable }: { items: PayItemView[]; editable: boolean }) {
  const { accountantId } = useClub();
  const { pending, run } = useServerAction();
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.id ?? `${it.description}-${i}`} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-deep px-3 py-2.5">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', it.kind === 'expense' ? 'bg-white/[.06] text-slate-200' : 'bg-emerald-500/15 text-emerald-300')}>
            {it.kind === 'expense' ? <Receipt className="size-4" aria-hidden /> : <Gift className="size-4" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[13px] font-semibold leading-snug">{it.description}</div>
            <div className="truncate text-[11px] text-slate-400">
              {it.kind === 'expense' ? 'Chi bởi ' : 'Giữ bởi '}
              {it.memberName}
              {it.memberId && it.memberId === accountantId ? ' · KT' : ''}
            </div>
          </div>
          <span className={cn('shrink-0 text-[13px] font-bold tabular-nums', it.kind === 'expense' ? 'text-white' : 'text-emerald-300')}>
            {it.kind === 'expense' ? '+' : '−'}
            {vnd(it.amount)}
          </span>
          {editable && it.id ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const id = it.id;
                if (id) run(() => removeLedgerItem(id), { success: 'Đã xoá khoản' });
              }}
              className="press grid size-8 place-items-center rounded-lg text-slate-400"
              aria-label={`Xoá ${it.description}`}
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      ))}
      {!items.length ? <div className="py-3 text-center text-sm text-slate-400">Chưa có khoản nào trong kỳ.</div> : null}
    </div>
  );
}

/** Form thêm khoản chi (ai đã ứng) / khoản thu (ai đang giữ) */
export function LedgerForm() {
  const { members, accountantId, period } = useClub();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [memberId, setMemberId] = useState(accountantId ?? members[0]?.id ?? '');
  const { pending, run } = useServerAction();

  return (
    <form
      className="mt-3 space-y-2 rounded-2xl border border-dashed border-white/15 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addLedgerItem({ periodId: period.id, kind, description, amount, memberId }), {
          success: 'Đã thêm khoản',
          onSuccess: () => {
            setDescription('');
            setAmount(0);
          },
        });
      }}
    >
      <div className="seg grid-cols-2">
        <button type="button" onClick={() => setKind('expense')} className={cn('seg-btn', kind === 'expense' && 'seg-on')} aria-pressed={kind === 'expense'}>
          Khoản chi
        </button>
        <button type="button" onClick={() => setKind('income')} className={cn('seg-btn', kind === 'income' && 'seg-on')} aria-pressed={kind === 'income'}>
          Khoản thu
        </button>
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={120}
        required
        placeholder={kind === 'expense' ? 'Ghi chú — VD: Nam ứng mua bóng' : 'Ghi chú — VD: Tài trợ giải'}
        aria-label="Ghi chú"
        className="field text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <MoneyInput value={amount} onValueChange={setAmount} placeholder="Số tiền" aria-label="Số tiền" className="text-sm" />
        <SelectField value={memberId} onChange={(e) => setMemberId(e.target.value)} aria-label={kind === 'expense' ? 'Người đã chi' : 'Người đang giữ'} className="text-sm">
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.id === accountantId ? ' (KT)' : ''}
            </option>
          ))}
        </SelectField>
      </div>
      <p className="text-[11px] text-slate-400">Người ứng tiền chi được trừ vào phần phải trả · người giữ khoản thu phải trả thêm.</p>
      <Button type="submit" variant="lime" className="w-full" disabled={pending || !description.trim() || !amount}>
        <Plus strokeWidth={3} />
        Thêm khoản
      </Button>
    </form>
  );
}

export function LedgerCard({ items, isCurrent }: { items: PayItemView[]; isCurrent: boolean }) {
  const { can } = useClub();
  const editable = isCurrent && can.finance;
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Receipt className="size-5 text-lime" aria-hidden />
        <span className="flex-1 text-[15px] font-semibold">Khoản thu / chi khác</span>
        <span className="text-xs text-slate-400">{items.length} khoản</span>
      </div>
      <LedgerList items={items} editable={editable} />
      {editable ? <LedgerForm /> : null}
    </div>
  );
}
