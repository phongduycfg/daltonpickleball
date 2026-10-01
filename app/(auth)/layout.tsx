import type { ReactNode } from 'react';

/** Khung cho màn đăng nhập / chờ duyệt */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-[440px] flex-col overflow-hidden bg-bg bg-[radial-gradient(120%_60%_at_50%_0%,#0E1B30_0%,#08111F_60%)] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      {children}
    </div>
  );
}
