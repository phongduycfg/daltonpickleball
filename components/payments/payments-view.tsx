'use client';

import { Archive } from 'lucide-react';
import type { FundSummary } from '@/lib/settlement';
import type { PaymentsView as View } from '@/lib/payments-view';
import type { PeriodSnapshot } from '@/lib/snapshot';
import { useClub } from '@/components/providers/club-provider';
import { PlanAndStats } from './plan-and-stats';
import { SettingsCard } from './settings-card';
import { FundConfirmCard } from './fund-confirm-card';
import { ResultsTable } from './results-table';
import { LedgerCard } from './ledger-card';
import { ClosePeriodCard } from './close-period-card';
import { useReportExport } from './use-report-export';

/** Màn Thanh toán (phần tương tác) — kỳ hiện tại có thể chỉnh, kỳ cũ chỉ xem */
export function PaymentsView({
  view,
  isCurrent,
  fund,
  excluded,
  sessionsByMember,
  report,
  title,
  fileCode,
}: {
  view: View;
  isCurrent: boolean;
  fund: FundSummary;
  excluded: string[];
  sessionsByMember: Record<string, number>;
  report: PeriodSnapshot;
  title: string;
  fileCode: string;
}) {
  const { can, settings } = useClub();
  const { exporting, exportPdf, node } = useReportExport(report, { title, clubName: settings.clubName, fileCode });

  return (
    <>
      {!isCurrent ? (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-200">
          <Archive className="size-4 shrink-0" aria-hidden />
          Kỳ đã đóng · chỉ xem. Chọn tháng hiện tại để chỉnh sửa.
        </div>
      ) : null}

      <PlanAndStats view={view} editable={isCurrent && can.finance} />
      {isCurrent ? <SettingsCard plan={view.plan} fixedRate={view.fixedRate} excluded={excluded} sessionsByMember={sessionsByMember} /> : null}
      {isCurrent && can.finance ? <FundConfirmCard fund={fund} rows={view.rows} /> : null}
      <ResultsTable rows={view.rows} isCurrent={isCurrent} exporting={exporting} onExport={() => void exportPdf()} />
      <LedgerCard items={view.items} isCurrent={isCurrent} />
      {isCurrent && can.finance ? <ClosePeriodCard view={view} fund={fund} exportPdf={exportPdf} exporting={exporting} /> : null}
      {node}
    </>
  );
}
