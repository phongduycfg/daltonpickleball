import type { Metadata } from 'next';
import { getAppContext, getPeriods, snapshotOfPeriod } from '@/lib/data';
import { viewFromSettlement, viewFromSnapshot } from '@/lib/payments-view';
import { periodCode, periodLabel } from '@/lib/dates';
import { PeriodSelect } from '@/components/shared/period-select';
import { PaymentsView } from '@/components/payments/payments-view';

export const metadata: Metadata = { title: 'Thanh toán' };

/** Thanh toán: kỳ hiện tại (tính trực tiếp) hoặc kỳ đã đóng (đọc snapshot) qua ?period= */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const [{ period: requested }, ctx, periods] = await Promise.all([searchParams, getAppContext(), getPeriods()]);
  const { period, data, result, fund, members, settings } = ctx;

  const archived = periods.find((p) => p.id === requested && p.closedAt && p.snapshot);
  const selectable = periods.filter((p) => !p.closedAt || p.snapshot);
  const sessionsByMember = Object.fromEntries(result.rows.map((r) => [r.memberId, r.sessions]));

  const shown = archived ?? period;
  const view =
    archived?.snapshot
      ? viewFromSnapshot(archived.snapshot)
      : viewFromSettlement({ result, plan: period.plan, fixedRate: period.fixedRate, payments: data.payments, ledger: data.ledger, members });
  const report = archived?.snapshot ?? snapshotOfPeriod({ period, data, members, settings, result });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h1 className="h-page">Thanh toán</h1>
        <PeriodSelect periods={selectable} value={shown.id} />
      </div>
      <PaymentsView
        key={shown.id}
        view={view}
        isCurrent={!archived}
        fund={fund}
        excluded={data.excluded}
        sessionsByMember={sessionsByMember}
        report={report}
        title={periodLabel(shown)}
        fileCode={`${periodCode(shown)}-${shown.year}`}
      />
    </section>
  );
}
