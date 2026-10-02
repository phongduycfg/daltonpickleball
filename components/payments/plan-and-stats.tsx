import { CalendarDays, Database, Users } from 'lucide-react';
import type { PaymentsView } from '@/lib/payments-view';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 3 ô số liệu tổng của kỳ. Ô "Đơn giá" ghi rõ phương án đang áp dụng
 * (đổi phương án ở thẻ "Thiết lập tính toán" bên dưới).
 */
export function PlanAndStats({ view }: { view: PaymentsView }) {
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
  );
}
