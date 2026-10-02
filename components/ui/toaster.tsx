'use client';

import { Toaster as Sonner } from 'sonner';

/** Thông báo nổi (sonner) nằm ngay trên thanh điều hướng 56px (cộng vùng an toàn iPhone) */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset="calc(68px + env(safe-area-inset-bottom))"
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
