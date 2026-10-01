'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Kiểm tra lại trạng thái duyệt */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="lime" className="w-full" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      <RefreshCw className={pending ? 'animate-spin' : undefined} />
      Kiểm tra lại
    </Button>
  );
}
