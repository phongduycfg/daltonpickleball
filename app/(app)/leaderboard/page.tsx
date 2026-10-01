import type { Metadata } from 'next';
import { getAppContext, getPeriods } from '@/lib/data';
import { PeriodSelect } from '@/components/shared/period-select';
import { ModeSwitch, Podium, RankTable, type RankMode, type RankRow } from '@/components/leaderboard/leaderboard-view';

export const metadata: Metadata = { title: 'Bảng xếp hạng' };

/** Bảng xếp hạng theo tháng: thua trận hoặc tham gia (?period=&mode=) */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; mode?: string }> }) {
  const [{ period: requested, mode: rawMode }, ctx, periods] = await Promise.all([searchParams, getAppContext(), getPeriods()]);
  const mode: RankMode = rawMode === 'join' ? 'join' : 'loss';
  const { period, result, members } = ctx;

  const archived = periods.find((p) => p.id === requested && p.closedAt && p.snapshot);
  const selectable = periods.filter((p) => !p.closedAt || p.snapshot);
  const shown = archived ?? period;

  const avatarOf = (id: string) => members.find((m) => m.id === id)?.avatarUrl ?? null;
  const source: { memberId: string; name: string; losses: number; sessions: number }[] = archived?.snapshot ? archived.snapshot.rows : result.rows;
  const sessionCount = archived?.snapshot ? archived.snapshot.sessionCount : result.sessionCount;

  const rows: RankRow[] = source
    .filter((r) => r.sessions > 0)
    .map((r) => ({ memberId: r.memberId, name: r.name, avatarUrl: avatarOf(r.memberId), losses: r.losses, sessions: r.sessions, avg: r.losses / r.sessions }))
    .sort((a, b) =>
      mode === 'loss'
        ? b.losses - a.losses || b.avg - a.avg || a.name.localeCompare(b.name, 'vi')
        : b.sessions - a.sessions || a.losses - b.losses || a.name.localeCompare(b.name, 'vi'),
    );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h1 className="h-page">Bảng xếp hạng</h1>
        <PeriodSelect periods={selectable} value={shown.id} />
      </div>
      <ModeSwitch mode={mode} periodId={shown.id} />

      {rows.length ? (
        <>
          <Podium rows={rows} mode={mode} sessionCount={sessionCount} />
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
