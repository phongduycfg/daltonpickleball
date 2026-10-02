import type { Metadata } from 'next';
import { getAppContext, getArchivedSnapshot } from '@/lib/data';
import { PeriodSelect } from '@/components/shared/period-select';
import { Podium, RankTable, type RankRow } from '@/components/leaderboard/leaderboard-view';

export const metadata: Metadata = { title: 'Xếp hạng' };

/** Xếp hạng thua trận theo tháng (?period= để xem kỳ cũ) */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const [{ period: requested }, ctx] = await Promise.all([searchParams, getAppContext()]);
  const { period, periods, result, members } = ctx;

  const selectable = periods.filter((p) => !p.closedAt || p.hasSnapshot);
  const candidate = periods.find((p) => p.id === requested && p.closedAt && p.hasSnapshot);
  const archivedSnapshot = candidate ? await getArchivedSnapshot(candidate.id) : null;
  const shown = (archivedSnapshot && candidate) || period;

  const avatarOf = (id: string) => members.find((m) => m.id === id)?.avatarUrl ?? null;
  const source: { memberId: string; name: string; losses: number; sessions: number }[] = archivedSnapshot ? archivedSnapshot.rows : result.rows;
  const sessionCount = archivedSnapshot ? archivedSnapshot.sessionCount : result.sessionCount;

  const rows: RankRow[] = source
    .filter((r) => r.sessions > 0)
    .map((r) => ({ memberId: r.memberId, name: r.name, avatarUrl: avatarOf(r.memberId), losses: r.losses, sessions: r.sessions, avg: r.losses / r.sessions }))
    // Thua nhiều nhất lên đầu; bằng nhau thì xét trung bình/buổi, rồi theo tên
    .sort((a, b) => b.losses - a.losses || b.avg - a.avg || a.name.localeCompare(b.name, 'vi'));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h1 className="h-page">Xếp hạng</h1>
        <PeriodSelect periods={selectable} value={shown.id} />
      </div>

      {rows.length ? (
        <>
          <Podium rows={rows} />
          <RankTable rows={rows} sessionCount={sessionCount} />
        </>
      ) : (
        <div className="card p-6 text-center">
          <div className="text-4xl" aria-hidden>
            🏆
          </div>
          <div className="mt-2 font-bold">Chưa có dữ liệu xếp hạng</div>
          <p className="mt-1 text-sm text-slate-400">Kỳ này chưa có buổi chơi nào.</p>
        </div>
      )}
    </section>
  );
}
