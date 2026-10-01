'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tuỳ chọn cá nhân lưu trên thiết bị (localStorage) — ví dụ bật/tắt rung, banner realtime.
 * Dùng useSyncExternalStore để đồng bộ giữa các component và tránh lệch khi hydrate.
 */
const listeners = new Set<() => void>();
const KEY_PREFIX = 'dalton:';

function read(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + key);
    return raw === null ? fallback : raw === '1';
  } catch {
    return fallback;
  }
}

export function useLocalPref(key: 'banner' | 'haptic', fallback = true): [boolean, (v: boolean) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    window.addEventListener('storage', cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener('storage', cb);
    };
  }, []);

  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );

  const set = useCallback(
    (v: boolean) => {
      try {
        window.localStorage.setItem(KEY_PREFIX + key, v ? '1' : '0');
      } catch {
        // Trình duyệt chặn bộ nhớ (chế độ ẩn danh) — bỏ qua, chỉ không ghi nhớ được
      }
      listeners.forEach((l) => l());
    },
    [key],
  );

  return [value, set];
}
