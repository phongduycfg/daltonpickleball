'use client';

import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action';
import { useHaptics } from './use-haptics';

/**
 * Chạy Server Action trong transition: tự hiển thị lỗi/thành công bằng toast
 * và trả về `pending` để khoá nút trong lúc xử lý.
 */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const haptic = useHaptics();

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, opts: { success?: string; onSuccess?: (data: T) => void } = {}) => {
      startTransition(async () => {
        const res = await action();
        if (!res.ok) {
          toast.error(res.error);
          haptic(40);
          return;
        }
        if (opts.success) toast.success(opts.success);
        haptic();
        opts.onSuccess?.(res.data);
      });
    },
    [haptic],
  );

  return { pending, run };
}
