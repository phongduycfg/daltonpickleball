import type { Metadata } from 'next';
import { TriangleAlert } from 'lucide-react';
import { LogoBall } from '@/components/brand/logo';
import { courtBackground } from '@/lib/court-art';
import { GoogleButton } from './google-button';

export const metadata: Metadata = { title: 'Đăng nhập' };

const ERRORS: Record<string, string> = {
  auth: 'Đăng nhập không thành công, vui lòng thử lại.',
  missing_code: 'Phiên đăng nhập không hợp lệ, vui lòng thử lại.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS.auth) : null;

  return (
    <>
      <div
        className="relative -mx-5 -mt-[calc(24px+env(safe-area-inset-top))] h-[42dvh] min-h-[260px] bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(0deg,#08111F 0%,rgba(8,17,31,0) 55%),${courtBackground(0, true)}` }}
        aria-hidden
      />
      <div className="-mt-12 flex flex-1 flex-col">
        <LogoBall className="size-16" />
        <h1 className="mt-4 text-[32px] font-extrabold leading-[1.05] tracking-tight">
          Dalton
          <br />
          <span className="text-lime">Pickleball</span>
        </h1>
        <p className="mt-3 text-[15px] text-slate-300">Lịch chơi, ghi trận thua, chia tiền và thanh toán VietQR cho cả CLB — realtime trên mọi điện thoại.</p>

        {message ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-live/40 bg-[#3B1520] px-3 py-2.5 text-sm text-[#FDA4AF]" role="alert">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {message}
          </div>
        ) : null}

        <div className="mt-auto space-y-3 pt-8">
          <GoogleButton />
          <p className="text-center text-xs text-slate-400">Thành viên mới cần Quản trị viên duyệt sau lần đăng nhập đầu tiên.</p>
        </div>
      </div>
    </>
  );
}
