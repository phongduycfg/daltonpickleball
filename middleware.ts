import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /**
   * Chạy middleware trên Node.js (ổn định từ Next.js 15.5) thay vì Edge Runtime.
   * Lý do: supabase-js (realtime) khởi tạo WebSocket ngay khi tạo client và báo lỗi
   * "Edge runtime detected" trên Vercel Edge → 500 MIDDLEWARE_INVOCATION_FAILED.
   * Node.js 22 trên Vercel có sẵn WebSocket nên không gặp lỗi này.
   */
  runtime: 'nodejs',
  // Bỏ qua file tĩnh, ảnh, manifest, service worker
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|icon-maskable.png|apple-icon.png|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
