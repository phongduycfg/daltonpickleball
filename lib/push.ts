import 'server-only';
import webpush from 'web-push';
import type { AppRole } from '@/types/database';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Web Push (VAPID + service worker + thư viện web-push), không dùng dịch vụ bên thứ ba.
 * Nếu chưa cấu hình khoá VAPID thì bỏ qua lặng lẽ (app vẫn chạy bình thường).
 */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

type Audience = { userIds: string[] } | { roles: AppRole[] } | { allExcept: string };

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = serverEnv.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(serverEnv.VAPID_SUBJECT ?? 'mailto:admin@example.com', pub, priv);
  configured = true;
  return true;
}

export async function sendPush(audience: Audience, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const admin = createAdminClient();

  // Xác định danh sách người nhận (chỉ thành viên đã duyệt)
  let userIds: string[];
  if ('userIds' in audience) {
    userIds = audience.userIds;
  } else {
    let q = admin.from('profiles').select('id').eq('status', 'active');
    if ('roles' in audience) q = q.in('role', audience.roles);
    else q = q.neq('id', audience.allExcept);
    const { data } = await q;
    userIds = (data ?? []).map((p) => p.id);
  }
  if (!userIds.length) return;

  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', userIds);
  if (!subs?.length) return;

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  await Promise.allSettled(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600 })
        .catch((err: { statusCode?: number }) => {
          // 404/410: đăng ký đã hết hạn → xoá
          if (err.statusCode === 404 || err.statusCode === 410) expired.push(s.id);
        }),
    ),
  );
  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired);
}
