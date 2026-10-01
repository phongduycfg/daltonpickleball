import type { Metadata } from 'next';
import { getAppContext } from '@/lib/data';
import { todayVN } from '@/lib/dates';
import { CourtView } from '@/components/court/court-view';

export const metadata: Metadata = { title: 'Sân đấu' };

export default async function CourtPage() {
  const { data, result } = await getAppContext();
  const monthTotals = Object.fromEntries(result.rows.map((r) => [r.memberId, r.losses]));
  return <CourtView sessions={data.sessions} today={todayVN()} monthTotals={monthTotals} />;
}
