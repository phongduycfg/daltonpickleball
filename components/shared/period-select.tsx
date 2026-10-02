'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { periodLabel, periodRange } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** Ô chọn kỳ (Kỳ 5 · 25/09 – nay) — ghi vào query `?period=` để chia sẻ được đường dẫn */
export function PeriodSelect({
  periods,
  value,
}: {
  periods: { id: string; seq: number; startDate: string; endDate: string | null }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="relative shrink-0">
      <span className="sr-only">Chọn kỳ</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set('period', e.target.value);
          startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
        }}
        className={cn('field !h-10 !w-auto appearance-none !rounded-xl !bg-card !pl-3 !pr-9 !text-[13px] !font-semibold', pending && 'opacity-60')}
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {periodLabel(p)} · {periodRange(p)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" aria-hidden />
    </label>
  );
}
