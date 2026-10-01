import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';

/**
 * Client service-role: BỎ QUA RLS. Chỉ dùng cho tác vụ hệ thống phía server
 * (đọc danh sách đăng ký push để gửi thông báo). Không bao giờ import vào client component.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
