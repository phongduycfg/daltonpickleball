import type { ReactNode } from 'react';
import { getAppContext } from '@/lib/data';
import { ClubProvider } from '@/components/providers/club-provider';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { AppHeader } from '@/components/shell/app-header';
import { BottomNav } from '@/components/shell/bottom-nav';
import { PushRegistrar } from '@/components/shell/push-registrar';

/**
 * Khung ứng dụng cho thành viên đã duyệt: header · nội dung · bottom nav.
 * Dữ liệu dùng chung lấy 1 lần ở server rồi truyền xuống client qua ClubProvider.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { me, members, venues, settings, period, data, result, fund, accountantId } = await getAppContext();

  const live = data.sessions.some((s) => s.status === 'live');
  const myRow = result.rows.find((r) => r.memberId === me.id);
  const isFinance = me.role === 'admin' || me.role === 'accountant';
  const payAlert =
    (isFinance && fund.pendingIds.length > 0) || (!!myRow && !myRow.isAccountant && myRow.net > 0 && (data.payments[me.id] ?? 'none') === 'none');

  return (
    <ClubProvider me={me} members={members} venues={venues} settings={settings} period={period} accountantId={accountantId}>
      <RealtimeProvider>
        <div className="relative mx-auto min-h-[100dvh] max-w-[440px] overflow-x-hidden bg-bg bg-[radial-gradient(120%_60%_at_50%_0%,#0E1B30_0%,#08111F_60%)]">
          <AppHeader />
          <main className="space-y-4 px-4 pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</main>
          <BottomNav live={live} payAlert={payAlert} />
        </div>
        <PushRegistrar />
      </RealtimeProvider>
    </ClubProvider>
  );
}
