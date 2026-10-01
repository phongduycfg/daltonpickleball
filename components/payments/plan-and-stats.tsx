'use client';

import { CalendarDays, Database, Users } from 'lucide-react';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { setPlan } from '@/actions/payment';
import type { PaymentsView } from '@/lib/payments-view';
import { shortMoney, vnd } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Chọn phương án chia + 3 ô số liệu tổng */
export function PlanAndStats({ view, editable }: { view: PaymentsView; editable: boolean }) {
  const { period } = useClub();
  const { pending, run } = useServerAction();
  const choose = (plan: 1 | 2) => {
    if (!editable || plan === view.plan) return;
    run(() => setPlan(period.id, plan), { success: 'Đã đổi phương án chia' });
  };

  const tiles = [
    { icon: Database, label: 'Tổng chi phí', value: vnd(view.totalCost), sub: `${view.sessionCount} buổi`, lime: false },
    { icon: Users, label: 'Số trận thua', value: `${view.totalLosses} trận`, sub: `${view.memberCount} thành viên`, lime: false },
    {
      icon: CalendarDays,
      label: 'Đơn giá',
      value: vnd(Math.round(view.unitPrice)),
      sub: view.plan === 1 ? 'mỗi trận thua' : '+ chia phần hụt',
      lime: true,
    },
  ];

  return (
    <>
      <div className={cn('seg grid-cols-2 overflow-hidden !p-0', pending && 'opacity-70')} role="radiogroup" aria-label="Phương án chia tiền">
        <button
          type="button"
          role="radio"
          aria-checked={view.plan === 1}
          disabled={!editable && view.plan !== 1}
          onClick={() => choose(1)}
          className={cn('press h-14 rounded-2xl px-2 text-[13px] leading-tight transition', view.plan === 1 ? 'seg-on' : 'text-slate-300')}
        >
          Chia đều theo
          <br />
          số trận thua
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={view.plan === 2}
          disabled={!editable && view.plan !== 2}
          onClick={() => choose(2)}
          className={cn('press h-14 rounded-2xl px-2 text-[13px] leading-tight transition', view.plan === 2 ? 'seg-on' : 'text-slate-300')}
        >
          Cố định {shortMoney(view.fixedRate)}/trận
          <br />+ Chia phần hụt
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="card min-w-0 !rounded-2xl p-2.5">
            <div className="flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-300">
              <t.icon className="size-4 text-lime" aria-hidden />
              {t.label}
            </div>
            <div className={cn('mt-1.5 truncate text-[15px] font-extrabold tabular-nums tracking-tight', t.lime && 'text-lime')}>{t.value}</div>
            <div className="mt-1 text-[11px] text-slate-400">{t.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}
