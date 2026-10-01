'use client';

import { publicEnv } from '@/lib/env';

/**
 * Tiện ích Web Push phía trình duyệt.
 * iOS chỉ hỗ trợ push khi ứng dụng đã được "Thêm vào Màn hình chính" (PWA).
 */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

/** Xin quyền + đăng ký push; trả về subscription dạng JSON để lưu server */
export async function subscribePush(): Promise<PushSubscriptionJSON> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn chưa cho phép thông báo trong trình duyệt');
  const reg = await registerServiceWorker();
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''),
    }));
  return sub.toJSON();
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Chuyển PushSubscriptionJSON sang dạng server action yêu cầu */
export function toSubscriptionInput(json: PushSubscriptionJSON): { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Trình duyệt trả về đăng ký push không hợp lệ');
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}
