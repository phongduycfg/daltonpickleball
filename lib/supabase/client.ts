'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { publicEnv } from '@/lib/env';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Supabase client phía trình duyệt (dùng cho Realtime, upload ảnh, đăng nhập Google) — singleton */
export function getBrowserClient() {
  browserClient ??= createBrowserClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return browserClient;
}
