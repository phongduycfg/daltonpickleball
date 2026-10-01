'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Lỗi trong khu vực ứng dụng — cho phép thử lại mà không mất phiên */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card p-6 text-center">
      <TriangleAlert className="mx-auto size-10 text-warn" aria-hidden />
      <div className="mt-3 text-lg font-extrabold">Có lỗi khi tải dữ liệu</div>
      <p className="mt-1 text-sm text-slate-400">Kiểm tra kết nối mạng rồi thử lại.{error.digest ? ` (Mã: ${error.digest})` : ''}</p>
      <Button variant="lime" className="mt-4 w-full" onClick={reset}>
        Thử lại
      </Button>
    </div>
  );
}
