'use client';

import { useRef, useState } from 'react';
import { ChevronDown, LogOut, UserRoundPen } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { RoleIcon } from '@/components/shared/role-icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useClub } from '@/components/providers/club-provider';
import { useRealtime } from '@/components/providers/realtime-provider';
import { ROLE_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ProfileSheet } from './profile-sheet';

/** Thanh trên cùng: logo · trạng thái realtime · menu tài khoản */
export function AppHeader() {
  const { me } = useClub();
  const { connected } = useRealtime();
  const [profileOpen, setProfileOpen] = useState(false);
  const signOutRef = useRef<HTMLFormElement>(null);
  const role = ROLE_META[me.role];

  return (
    <header className="relative z-30 flex items-center gap-2.5 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
      <Logo />

      <div
        className={cn(
          'ml-auto flex h-7 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold text-slate-200',
          connected ? 'border-emerald-500/25 bg-[#0D2A22]' : 'border-amber-400/25 bg-[#2A230D]',
        )}
        role="status"
        aria-live="polite"
      >
        <span
          className={cn('size-1.5 shrink-0 rounded-full', connected ? 'animate-blink bg-done shadow-[0_0_8px_#22C55E]' : 'bg-amber-400')}
          aria-hidden
        />
        {connected ? (
          <>
            <span className="hidden min-[420px]:inline">Realtime</span> Connected
          </>
        ) : (
          'Đang kết nối…'
        )}
      </div>

      {/* modal={false}: tránh xung đột khoá cuộn/pointer khi mở sheet từ menu */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button className="press group relative flex shrink-0 items-center gap-0.5" aria-label="Mở menu tài khoản">
            <span className="relative">
              <MemberAvatar member={me} size="sm" />
              <span className={cn('absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full border-2 border-bg', role.badge)}>
                <RoleIcon role={me.role} className="size-2.5" strokeWidth={3} />
              </span>
            </span>
            <ChevronDown className="size-4 text-slate-300 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex items-center gap-3 p-2">
            <MemberAvatar member={me} size="md" />
            <div className="min-w-0">
              <div className="truncate font-bold">{me.name}</div>
              <div className="truncate text-[11px] text-slate-400">{me.email}</div>
              <span className={cn('mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold', role.pill)}>{role.label}</span>
            </div>
          </div>
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <UserRoundPen />
            Thông tin cá nhân
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-[#FCA5A5]" onSelect={() => signOutRef.current?.requestSubmit()}>
            <LogOut className="!text-[#FCA5A5]" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
      {/* Form đăng xuất đặt ngoài menu để không bị gỡ khỏi DOM khi menu đóng */}
      <form ref={signOutRef} action="/auth/signout" method="post" className="hidden" />
    </header>
  );
}
