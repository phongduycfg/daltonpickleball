'use client';

import * as React from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

/** Dropdown menu (Radix) — điều hướng bàn phím & aria sẵn có */
export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Menu.Content>>(
  ({ className, sideOffset = 8, ...props }, ref) => (
    <Menu.Portal>
      <Menu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'card z-50 w-72 !rounded-2xl p-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  ),
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Menu.Item>>(
  ({ className, ...props }, ref) => (
    <Menu.Item
      ref={ref}
      className={cn(
        'flex h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-3 text-sm outline-none data-[highlighted]:bg-white/5 [&_svg]:size-4 [&_svg]:text-slate-300',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = () => <Menu.Separator className="my-1 h-px bg-white/[.07]" />;
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => (
  <Menu.Label className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{children}</Menu.Label>
);
