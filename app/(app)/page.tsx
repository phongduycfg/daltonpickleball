import { getAppContext } from '@/lib/data';
import { byDateTime } from '@/lib/session-view';
import { LiveBanner } from '@/components/home/live-banner';
import { LivePanel } from '@/components/home/live-panel';
import { EmptyHome } from '@/components/home/empty-home';
import { FundCard, WalletCard } from '@/components/home/wallet-card';

/** Home: buổi đang diễn ra (hoặc gần nhất), ghi trận thua, ví cá nhân / quỹ */
export default async function HomePage() {
  const { me, data, result, fund, accountantId } = await getAppContext();

  const played = data.sessions.filter((s) => s.status !== 'scheduled').sort(byDateTime);
  const live = played.find((s) => s.status === 'live');
  const homeSession = live ?? played.at(-1) ?? null;
  const next = data.sessions.filter((s) => s.status === 'scheduled').sort(byDateTime)[0] ?? null;

  const monthTotals = Object.fromEntries(result.rows.map((r) => [r.memberId, r.losses]));
  const myRow = result.rows.find((r) => r.memberId === me.id);
  const isAccountant = me.id === accountantId;

  return (
    <>
      <LiveBanner />
      {homeSession ? <LivePanel key={homeSession.id} session={homeSession} monthTotals={monthTotals} /> : <EmptyHome next={next} />}
      {played.length > 0 && myRow && !isAccountant ? <WalletCard row={myRow} status={data.payments[me.id] ?? 'none'} /> : null}
      {played.length > 0 && isAccountant ? <FundCard fund={fund} /> : null}
    </>
  );
}
