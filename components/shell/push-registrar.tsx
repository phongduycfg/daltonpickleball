'use client';

import { useEffect } from 'react';
import { savePushSubscription } from '@/actions/profile';
import { pushSupported, registerServiceWorker, toSubscriptionInput } from '@/lib/push-client';

/**
 * Đăng ký service worker khi mở app và đồng bộ lại subscription đã có
 * (trình duyệt có thể tự xoay khoá push → server cần bản mới nhất).
 */
export function PushRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await registerServiceWorker();
        if (!pushSupported() || Notification.permission !== 'granted') return;
        const sub = await reg.pushManager.getSubscription();
        if (sub && !cancelled) await savePushSubscription(toSubscriptionInput(sub.toJSON()));
      } catch {
        // Không chặn ứng dụng nếu trình duyệt không hỗ trợ đầy đủ
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
