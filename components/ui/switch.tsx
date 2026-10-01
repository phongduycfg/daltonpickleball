'use client';

import { cn } from '@/lib/utils';

/** Công tắc bật/tắt (role="switch") */
export function Switch({ checked, onCheckedChange, label, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn('press relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40', checked ? 'bg-lime' : 'bg-slate-600')}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}
