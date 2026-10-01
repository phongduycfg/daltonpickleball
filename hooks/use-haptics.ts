'use client';

import { useCallback } from 'react';
import { useLocalPref } from './use-local-pref';

/** Rung phản hồi khi chạm (nếu thiết bị hỗ trợ và người dùng bật) */
export function useHaptics() {
  const [enabled] = useLocalPref('haptic', true);
  return useCallback(
    (ms = 12) => {
      if (enabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
    },
    [enabled],
  );
}
