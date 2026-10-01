import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Clock, LogOut, ShieldX } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { RefreshButton } from './refresh-button';

export const metadata: Metadata = { title: 'Chờ duyệt' };

/** Màn chờ duyệt (đã đăng nhập Google nhưng Quản trị viên chưa duyệt) / bị từ chối */
export default async function PendingPage() {
  const me = await getCurrentMember();
  if (!me) redirect('/login');
  if (me.status === 'active') redirect('/');
  const rejected = me.status === 'rejected';

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative">
        <MemberAvatar member={me} size="xl" />
        <span className={`absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-4 border-bg ${rejected ? 'bg-live' : 'bg-soon'}`}>
          {rejected ? <ShieldX className="size-4" aria-hidden /> : <Clock className="size-4" aria-hidden />}
        </span>
      </div>
      <h1 className="mt-5 text-2xl font-extrabold">{rejected ? 'Tài khoản chưa được chấp nhận' : 'Đang chờ duyệt'}</h1>
      <p className="mt-2 max-w-[320px] text-sm text-slate-300">
        {rejected ? (
          <>Tài khoản {me.email} chưa được tham gia CLB. Liên hệ Quản trị viên nếu đây là nhầm lẫn.</>
        ) : (
          <>
            Xin chào <b className="text-white">{me.name}</b>! Quản trị viên đã nhận được yêu cầu của bạn. Bạn sẽ dùng được ứng dụng ngay khi được duyệt.
          </>
        )}
      </p>
      <div className="mt-8 w-full max-w-[320px] space-y-2">
        {!rejected ? <RefreshButton /> : null}
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="dark" className="w-full">
            <LogOut />
            Đăng xuất ({me.email})
          </Button>
        </form>
      </div>
    </div>
  );
}
