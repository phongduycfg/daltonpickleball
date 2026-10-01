import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoBall } from '@/components/brand/logo';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col items-center justify-center bg-bg px-6 text-center">
      <LogoBall className="size-14" />
      <h1 className="mt-4 text-2xl font-extrabold">Không tìm thấy trang</h1>
      <p className="mt-1 text-sm text-slate-400">Đường dẫn không tồn tại hoặc đã bị đổi.</p>
      <Button variant="lime" className="mt-6 w-full" asChild>
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  );
}
