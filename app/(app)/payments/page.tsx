import type { Metadata } from 'next';
import { getAppContext, getArchivedSnapshot, snapshotOfPeriod } from '@/lib/data';
import { viewFromSettlement, viewFromSnapshot } from '@/lib/payments-view';
import { periodLabel, periodRange } from '@/lib/dates';
import { PeriodSelect } from '@/components/shared/period-select';
import { PaymentsView } from '@/components/payments/payments-view';

export const metadata: Metadata = { title: 'Thanh toán' };

/** Thanh toán: kỳ hiện tại (tính trực tiếp) hoặc kỳ đã đóng (đọc snapshot) qua ?period= */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const [{ period: requested }, ctx] = await Promise.all([searchParams, getAppContext()]);
  const { period, periods, data, result, fund, members, settings } = ctx;

  const selectable = periods.filter((p) => !p.closedAt || p.hasSnapshot);
  const candidate = periods.find((p) => p.id === requested && p.closedAt && p.hasSnapshot);
  // Snapshot kỳ cũ chỉ tải khi được chọn
  const archivedSnapshot = candidate ? await getArchivedSnapshot(candidate.id) : null;
  const archived = archivedSnapshot ? candidate : undefined;
  const sessionsByMember = Object.fromEntries(result.rows.map((r) => [r.memberId, r.sessions]));

  const shown = archived ?? period;
  const view = archivedSnapshot
    ? viewFromSnapshot(archivedSnapshot)
    : viewFromSettlement({ result, plan: period.plan, fixedRate: period.fixedRate, payments: data.payments, ledger: data.ledger, members });
  const report = archivedSnapshot ?? snapshotOfPeriod({ period, data, members, settings, result });

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
        title={`${periodLabel(shown)} (${periodRange(shown)})`}
        fileCode={`Ky${shown.seq}-${shown.startDate}`}
      />
    </section>
  );
}
