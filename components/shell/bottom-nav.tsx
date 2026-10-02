'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, House, Settings, Trophy } from 'lucide-react';
import { PaddlesIcon } from '@/components/brand/icons';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home', icon: House },
  { href: '/court', label: 'Sân đấu', icon: PaddlesIcon },
  { href: '/payments', label: 'Thanh toán', icon: ClipboardList },
  { href: '/leaderboard', label: 'Xếp hạng', icon: Trophy },
  { href: '/admin', label: 'Quản trị', icon: Settings },
] as const;

/** Thanh điều hướng dưới (vùng chạm ≥ 48px, chừa safe-area cho iPhone) */
export function BottomNav({ live, payAlert }: { live: boolean; payAlert: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[440px] -translate-x-1/2 border-t border-white/[.08] bg-nav pb-[env(safe-area-inset-bottom)]"
      aria-label="Điều hướng chính"
    >
      {/* Cao 56px (chưa tính vùng an toàn của iPhone) — chuẩn thanh tab của Zalo, Facebook, iOS/Android */}
      <div className="grid h-14 grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={cn('press relative flex min-w-0 flex-col items-center justify-center gap-1', active ? 'text-lime' : 'text-slate-400')}
            >
              {active ? <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-lime" aria-hidden /> : null}
              <span className="relative size-6">
                <Icon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
                {href === '/payments' && payAlert && !active ? (
                  <span className="absolute -right-1.5 -top-1 size-3 rounded-full border-2 border-nav bg-live" aria-label="Có thanh toán cần xử lý" />
                ) : null}
                {href === '/' && live && !active ? (
                  <span className="absolute -right-1 -top-0.5 size-2.5 animate-blink rounded-full border-2 border-nav bg-live" aria-label="Đang có buổi chơi" />
                ) : null}
              </span>
              <span className={cn('whitespace-nowrap text-[11px] leading-none tracking-tight', active && 'font-semibold')}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
