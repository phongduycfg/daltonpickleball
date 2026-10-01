'use client';

import { useEffect, useState } from 'react';

/**
 * Đồng hồ cập nhật mỗi `intervalMs`. Trả null cho tới khi mount
 * (tránh lệch nội dung giữa server và client khi hydrate).
 */
export function useNow(intervalMs = 1000, active = true): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs, active]);
  return now;
}
