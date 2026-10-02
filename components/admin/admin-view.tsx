'use client';

import { useState } from 'react';
import { Bell, ChevronRight, CloudUpload, Coins, Droplet, Ellipsis, Lock, MapPin, Plus, Settings, Users, Wallet } from 'lucide-react';
import type { Venue } from '@/types/app';
import { CourtIcon } from '@/components/brand/icons';
import { Sheet } from '@/components/ui/sheet';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { useClub } from '@/components/providers/club-provider';
import { LedgerForm, LedgerList } from '@/components/payments/ledger-card';
import type { PayItemView } from '@/lib/payments-view';
import { courtBackground } from '@/lib/court-art';
import { ROLE_META } from '@/lib/constants';
import { periodLabel } from '@/lib/dates';
import { vnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ApprovalsSheet, MemberSheet, MembersSheet, sortByRole, type PendingMember } from './member-sheets';
import { BackupSheet, BankSheet, GeneralSheet, NotifySheet, VenueSheet } from './settings-sheets';

type SheetName = 'members' | 'approvals' | 'venue' | 'items' | 'bank' | 'general' | 'backup' | 'notify';

/** Màn Quản trị: thành viên · sân · chi phí · cài đặt */
export function AdminView({ pending, items }: { pending: PendingMember[]; items: PayItemView[] }) {
  const { me, members, venues, settings, period, can } = useClub();
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);

  const open = (name: SheetName) => setSheet(name);
  const closeIf = (name: SheetName) => (v: boolean) => !v && sheet === name && setSheet(null);
  const extTotal = items.reduce((a, i) => a + (i.kind === 'expense' ? i.amount : -i.amount), 0);
  const firstVenue = venues[0];

  const settingRows = [
    { key: 'bank' as const, icon: Wallet, title: 'Cài đặt tính tiền', desc: 'Tài khoản nhận tiền, VietQR, cú pháp chuyển khoản', show: can.finance },
    { key: 'backup' as const, icon: CloudUpload, title: 'Sao lưu dữ liệu', desc: 'Tải file sao lưu toàn bộ dữ liệu CLB', show: can.admin },
    { key: 'notify' as const, icon: Bell, title: 'Thông báo', desc: 'Thông báo đẩy, banner realtime, rung khi bấm', show: true },
  ];

  return (
    <section className="space-y-4">
      <div className="pt-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="h-page">Quản trị</h1>
          {can.admin ? (
            <button type="button" onClick={() => open('general')} className="press flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-card px-3 text-[13px]">
              <Settings className="size-4" aria-hidden />
              Cài đặt chung
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[13px] text-slate-300">Quản lý toàn bộ hoạt động {settings.clubName}</p>
        {!can.admin ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <Lock className="size-3.5" aria-hidden />
            Bạn đang là {ROLE_META[me.role].label} — một số mục chỉ xem hoặc được ẩn.
          </p>
        ) : null}
      </div>

      {/* Thành viên */}
      <div className="card p-3">
        <div className="flex items-center gap-3 p-1">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#16233A] text-lime">
            <Users className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold leading-tight">Quản lý thành viên</div>
            <div className="truncate text-xs text-slate-300">Duyệt, phân quyền, trình độ</div>
          </div>
          {can.admin ? (
            <button
              type="button"
              onClick={() => open('approvals')}
              className="press relative flex h-9 shrink-0 items-center gap-1 rounded-xl bg-lime px-3 text-xs font-bold text-ink shadow-[0_0_20px_rgba(215,245,49,.3)]"
            >
              <Plus className="size-4" strokeWidth={3} aria-hidden />
              Thêm
              {pending.length ? (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-live px-1 text-[11px] font-bold text-white" aria-label={`${pending.length} đăng ký chờ duyệt`}>
                  {pending.length}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
        <div className="mt-3 divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-deep">
          {sortByRole(members)
            .slice(0, 4)
            .map((m) => (
              <button key={m.id} type="button" onClick={() => setMemberId(m.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left" aria-label={`Tuỳ chọn ${m.name}`}>
                <MemberAvatar member={m} size="sm" />
                <span className="truncate text-sm">{m.name}</span>
                {m.role === 'admin' ? (
                  <span className="-ml-1 text-sm" aria-hidden>
                    👑
                  </span>
                ) : null}
                <span className={cn('whitespace-nowrap rounded-lg px-1.5 py-0.5 text-[11px] font-semibold', ROLE_META[m.role].pill)}>{ROLE_META[m.role].label}</span>
                <span className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-card2">
                  <Ellipsis className="size-4" aria-hidden />
                </span>
              </button>
            ))}
        </div>
        <button
          type="button"
          onClick={() => open('members')}
          className="press mt-2 flex h-11 w-full items-center gap-2.5 rounded-2xl border border-white/[.06] bg-deep px-3 text-sm"
        >
          <Users className="size-5 text-slate-200" aria-hidden />
          Xem tất cả thành viên ({members.length})
          <ChevronRight className="ml-auto size-4 text-slate-400" aria-hidden />
        </button>
      </div>

      {/* Sân */}
      <div className="card p-3">
        <div className="flex items-center gap-3 p-1">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#16233A] text-sky-300">
            <CourtIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold leading-tight">Quản lý sân</div>
            <div className="truncate text-xs text-slate-300">Danh sách sân, chi phí mặc định</div>
          </div>
          {can.admin ? (
            <button
              type="button"
              onClick={() => {
                setEditVenue(null);
                open('venue');
              }}
              className="press flex h-9 shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-card2 px-3 text-xs"
            >
              <Plus className="size-4" aria-hidden />
              Thêm sân
            </button>
          ) : null}
        </div>
        <div className="mt-3 divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-deep">
          {venues.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3 p-2.5">
              <div className="h-12 w-16 shrink-0 rounded-xl border border-white/10 bg-cover bg-center" style={{ backgroundImage: courtBackground(i) }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{v.name}</div>
                {v.area ? (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{v.area}</span>
                  </div>
                ) : null}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-300">{vnd(v.defaultCost)}/buổi</span>
                  <span className={cn('flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold', v.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-400')}>
                    <span className={cn('size-1.5 rounded-full', v.isActive ? 'bg-done' : 'bg-slate-500')} aria-hidden />
                    {v.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                  </span>
                </div>
              </div>
              {can.admin ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditVenue(v);
                    open('venue');
                  }}
                  className="press grid size-9 shrink-0 place-items-center rounded-full bg-card2"
                  aria-label={`Sửa ${v.name}`}
                >
                  <Ellipsis className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
          {!venues.length ? <div className="p-4 text-center text-sm text-slate-400">Chưa có sân nào.</div> : null}
        </div>
      </div>

      {/* Chi phí */}
      {can.finance ? (
        <div className="card p-3">
          <button type="button" onClick={() => open('items')} className="press flex w-full items-center gap-3 p-1 text-left">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#2A2E12] text-lime">
              <Coins className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold leading-tight">Quản lý chi phí</div>
              <div className="text-xs text-slate-300">Chi phí sân, nước, khoản khác</div>
            </div>
            <ChevronRight className="size-5 text-slate-400" aria-hidden />
          </button>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={!can.admin || !firstVenue}
              onClick={() => {
                if (!firstVenue) return;
                setEditVenue(firstVenue);
                open('venue');
              }}
              className="press rounded-2xl border border-white/[.06] bg-deep p-2.5 text-left disabled:active:scale-100"
            >
              <CourtIcon className="block size-5 text-lime" />
              <div className="mt-1.5 text-[11px] text-slate-200">Sân + nước</div>
              <div className="truncate text-sm font-extrabold tabular-nums text-lime">{vnd(firstVenue?.defaultCost ?? 0)}</div>
              <div className="text-[11px] text-slate-400">Mặc định/buổi</div>
            </button>
            <button type="button" onClick={() => open('items')} className="press rounded-2xl border border-white/[.06] bg-deep p-2.5 text-left">
              <Droplet className="block size-5 text-sky-300" aria-hidden />
              <div className="mt-1.5 text-[11px] text-slate-200">Chi phí khác</div>
              <div className="truncate text-sm font-extrabold tabular-nums text-lime">{vnd(extTotal)}</div>
              <div className="text-[11px] text-slate-400">{items.length} khoản</div>
            </button>
            <button type="button" onClick={() => open(can.admin ? 'general' : 'bank')} className="press rounded-2xl border border-white/[.06] bg-deep p-2.5 text-left">
              <Settings className="block size-5 text-violet-300" aria-hidden />
              <div className="mt-1.5 text-[11px] font-semibold text-slate-200">Nâng cao</div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-400">Đơn giá, ngưỡng, VietQR</div>
            </button>
          </div>
        </div>
      ) : null}

      {/* Cài đặt */}
      {settingRows
        .filter((r) => r.show)
        .map((r) => (
          <button key={r.key} type="button" onClick={() => open(r.key)} className="press card flex w-full items-center gap-3 !rounded-2xl p-3.5 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#16233A] text-slate-200">
              <r.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{r.title}</div>
              <div className="truncate text-xs text-slate-300">{r.desc}</div>
            </div>
            <ChevronRight className="size-5 text-slate-400" aria-hidden />
          </button>
        ))}

      <MembersSheet open={sheet === 'members'} onOpenChange={closeIf('members')} onPick={(id) => setMemberId(id)} />
      <MemberSheet memberId={memberId} onOpenChange={(v) => !v && setMemberId(null)} />
      <ApprovalsSheet open={sheet === 'approvals'} onOpenChange={closeIf('approvals')} pending={pending} />
      <VenueSheet open={sheet === 'venue'} onOpenChange={closeIf('venue')} venue={editVenue} />
      <BankSheet open={sheet === 'bank'} onOpenChange={closeIf('bank')} />
      <GeneralSheet open={sheet === 'general'} onOpenChange={closeIf('general')} />
      <BackupSheet open={sheet === 'backup'} onOpenChange={closeIf('backup')} />
      <NotifySheet open={sheet === 'notify'} onOpenChange={closeIf('notify')} />
      <Sheet open={sheet === 'items'} onOpenChange={closeIf('items')} title={`Chi phí khác · ${periodLabel(period)}`}>
        <LedgerList items={items} editable={can.finance} />
        {can.finance ? <LedgerForm /> : null}
      </Sheet>
    </section>
  );
}
