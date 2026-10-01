'use client';

import { Toaster as Sonner } from 'sonner';

/** Thông báo nổi (sonner) đặt phía trên bottom nav */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={96}
      theme="dark"
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border !border-lime/30 !bg-card2 !text-white !text-[13px] !font-semibold',
          error: '!border-live/40 !bg-[#3B1520] !text-[#FDA4AF]',
        },
      }}
    />
  );
}
