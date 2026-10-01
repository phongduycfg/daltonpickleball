'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Check, ClipboardList, Info, Lock, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { setExclusion, setPlan } from '@/actions/payment';
import { shortMoney, vnd } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Thiết lập tính toán: phương án + danh sách không chia phần hụt */
export function SettingsCard({ plan, fixedRate, excluded, sessionsByMember }: { plan: 1 | 2; fixedRate: number; excluded: string[]; sessionsByMember: Record<string, number> }) {
  const { can, period, member, members, settings } = useClub();
  const router = useRouter();
  const [pickOpen, setPickOpen] = useState(false);
  const { pending, run } = useServerAction();

  const options = [
    { id: 1 as const, title: 'Chia đều theo số trận thua', desc: 'Tổng chi phí / tổng số trận thua' },
    { id: 2 as const, title: `Cố định ${shortMoney(fixedRate)}/trận + Chia phần hụt`, desc: `Mỗi trận ${vnd(fixedRate)}, phần còn lại chia đều` },
  ];

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Calculator className="size-5 text-lime" aria-hidden />
        <span className="text-[15px] font-semibold">Thiết lập tính toán</span>
        {!can.finance ? (
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Lock className="size-3.5" aria-hidden />
            Chỉ xem
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-1" role="radiogroup" aria-label="Phương án chia tiền">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={plan === o.id}
            disabled={!can.finance || pending}
            onClick={() => plan !== o.id && run(() => setPlan(period.id, o.id), { success: 'Đã đổi phương án chia' })}
            className="press flex w-full items-start gap-3 py-2 text-left disabled:active:scale-100"
          >
            <span
              className={cn(
                'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2',
                plan === o.id ? 'border-lime bg-lime shadow-[0_0_14px_rgba(215,245,49,.5)]' : 'border-slate-400',
              )}
            >
              {plan === o.id ? <span className="size-2.5 rounded-full bg-ink" /> : null}
            </span>
            <span>
              <span className="block text-sm">{o.title}</span>
              <span className="block text-xs text-slate-400">{o.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 border-t border-white/[.07] pt-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          Thành viên không chia phần hụt
          <Info className="size-4 text-slate-400" aria-label={`Gợi ý: người chơi dưới ${settings.minSessions} buổi`} />
        </div>
        {plan === 1 ? <p className="mt-1 text-xs text-slate-400">Chỉ áp dụng cho phương án cố định.</p> : null}
        <div className={cn('mt-2.5 flex flex-wrap gap-2', plan === 1 && 'opacity-50')}>
          {excluded.map((id) => {
            const m = member(id);
            if (!m) return null;
            return (
              <span key={id} className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-card2 pl-1 pr-1.5">
                <MemberAvatar member={m} size="xs" />
                <span className="text-sm">{m.name}</span>
                {can.finance ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setExclusion(period.id, id, false))}
                    className="press grid size-7 place-items-center text-slate-300"
                    aria-label={`Bỏ ${m.name} khỏi danh sách`}
                  >
                    <X className="size-4" strokeWidth={2.6} />
                  </button>
                ) : null}
              </span>
            );
          })}
          {can.finance ? (
            <button
              type="button"
              onClick={() => setPickOpen(true)}
              className="press flex h-10 items-center gap-1.5 rounded-full border border-dashed border-white/30 px-3.5 text-sm"
            >
              <Plus className="size-4" aria-hidden />
              Chọn thành viên
            </button>
          ) : null}
          {!excluded.length && !can.finance ? <span className="text-xs text-slate-400">Không có</span> : null}
        </div>
      </div>

      {can.finance ? (
        <Button
          variant="lime"
          size="lg"
          className="mt-4 w-full"
          onClick={() => {
            router.refresh();
            toast.success('Đã tính toán lại theo dữ liệu mới nhất');
          }}
        >
          <ClipboardList className="size-5" />
          Tính toán lại
        </Button>
      ) : null}

      <Sheet open={pickOpen} onOpenChange={setPickOpen} title="Không chia phần hụt" description={`Gợi ý: người chơi dưới ${settings.minSessions} buổi (tô lime)`}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {members.map((m) => {
              const on = excluded.includes(m.id);
              const sessions = sessionsByMember[m.id] ?? 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  disabled={pending}
                  onClick={() => run(() => setExclusion(period.id, m.id, !on))}
                  className={cn('press relative flex min-w-0 flex-col items-center gap-1 rounded-2xl border p-2.5', on ? 'border-white/40 bg-white/10' : 'border-white/10 bg-card')}
                >
                  <MemberAvatar member={m} size="md" />
                  <span className="w-full truncate text-center text-sm font-semibold">{m.name}</span>
                  <span className={cn('text-[11px]', sessions < settings.minSessions ? 'text-lime' : 'text-slate-400')}>{sessions} buổi</span>
                  <span className={cn('absolute right-2 top-2 grid size-5 place-items-center rounded-md', on ? 'bg-white text-ink' : 'border border-slate-500')}>
                    {on ? <Check className="size-3.5" strokeWidth={3.5} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <Button variant="lime" className="w-full" onClick={() => setPickOpen(false)}>
            Xong
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
