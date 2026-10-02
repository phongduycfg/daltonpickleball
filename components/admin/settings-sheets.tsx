'use client';

import { useEffect, useState } from 'react';
import { BellRing, Download, QrCode, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Venue } from '@/types/app';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/shared/money-input';
import { Field, SelectField } from '@/components/shared/select-field';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { useLocalPref } from '@/hooks/use-local-pref';
import { deleteVenue, saveVenue, updateBankSettings, updateGeneralSettings } from '@/actions/admin';
import { removePushSubscription, savePushSubscription } from '@/actions/profile';
import { BANKS } from '@/lib/constants';
import { periodCode } from '@/lib/dates';
import { stripVietnamese } from '@/lib/format';
import { currentSubscription, pushSupported, subscribePush, toSubscriptionInput } from '@/lib/push-client';
import { bankName, isBankValid, renderTransferNote, vietQrImageUrl } from '@/lib/vietqr';

type SheetProps = { open: boolean; onOpenChange: (v: boolean) => void };

const BLANK_VENUE = { name: '', area: '', defaultCost: 0, isActive: true };

/** Thêm / sửa sân */
export function VenueSheet({ venue, open, onOpenChange }: SheetProps & { venue: Venue | null }) {
  const [form, setForm] = useState(BLANK_VENUE);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, run } = useServerAction();

  useEffect(() => {
    if (open) setForm(venue ? { name: venue.name, area: venue.area, defaultCost: venue.defaultCost, isActive: venue.isActive } : BLANK_VENUE);
    setConfirmDelete(false);
  }, [open, venue]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={venue ? 'Sửa sân' : 'Thêm sân'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveVenue({ id: venue?.id, ...form }), { success: 'Đã lưu sân', onSuccess: () => onOpenChange(false) });
        }}
      >
        <Field label="Tên sân">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} placeholder="VD: Sân Pickle Park" className="field" />
        </Field>
        <Field label="Khu vực">
          <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} maxLength={80} placeholder="VD: Cầu Giấy, Hà Nội" className="field" />
        </Field>
        <Field label="Chi phí sân + nước mặc định / buổi">
          <MoneyInput value={form.defaultCost} onValueChange={(defaultCost) => setForm({ ...form, defaultCost })} />
        </Field>
        <div className="flex h-12 items-center justify-between rounded-2xl border border-white/[.06] bg-deep px-4">
          <span className="text-sm">Đang hoạt động</span>
          <Switch checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} label="Sân đang hoạt động" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="dark" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" variant="lime" disabled={pending}>
            Lưu sân
          </Button>
        </div>
        {venue ? (
          confirmDelete ? (
            <div className="space-y-2 rounded-2xl border border-live/40 bg-[#3B1520]/60 p-3">
              <p className="flex items-start gap-2 text-[13px] text-[#FDA4AF]">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Xoá hẳn sân {venue.name}? Sân đã có buổi chơi sẽ không xoá được (giữ lịch sử) — khi đó hãy tắt Đang hoạt động.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant="dark" onClick={() => setConfirmDelete(false)}>
                  Không xoá
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() => run(() => deleteVenue(venue.id), { success: `Đã xoá ${venue.name}`, onSuccess: () => onOpenChange(false) })}
                >
                  <Trash2 />
                  Xoá hẳn
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="danger-outline" className="w-full" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Xoá sân
            </Button>
          )
        ) : null}
      </form>
    </Sheet>
  );
}

/** Tài khoản nhận tiền + cú pháp nội dung chuyển khoản, xem trước VietQR */
export function BankSheet({ open, onOpenChange }: SheetProps) {
  const { settings, me, period } = useClub();
  const [form, setForm] = useState({ bin: '', accountNo: '', owner: '', syntax: '' });
  const { pending, run } = useServerAction();

  useEffect(() => {
    if (open)
      setForm({
        bin: settings.bankBin ?? BANKS[0].bin,
        accountNo: settings.bankAccountNo ?? '',
        owner: settings.bankOwner ?? '',
        syntax: settings.transferSyntax,
      });
  }, [open, settings]);

  const bank = { bin: form.bin, accountNo: form.accountNo, owner: form.owner };
  const valid = isBankValid(bank);
  const sample = renderTransferNote(form.syntax, me.name, periodCode(period));
  const upper = (s: string) => stripVietnamese(s).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Cài đặt tính tiền" description="Tài khoản Kế toán nhận tiền và nội dung chuyển khoản">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateBankSettings(form), { success: 'Đã lưu cài đặt VietQR', onSuccess: () => onOpenChange(false) });
        }}
      >
        <Field label="Ngân hàng">
          <SelectField value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })}>
            {BANKS.map((b) => (
              <option key={b.bin} value={b.bin}>
                {b.name}
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="Số tài khoản">
          <input
            value={form.accountNo}
            onChange={(e) => setForm({ ...form, accountNo: e.target.value.replace(/\D/g, '') })}
            inputMode="numeric"
            maxLength={19}
            required
            className="field tabular-nums tracking-wider"
          />
        </Field>
        <Field label="Tên chủ tài khoản (không dấu)">
          <input value={form.owner} onChange={(e) => setForm({ ...form, owner: upper(e.target.value) })} required maxLength={60} className="field uppercase" />
        </Field>
        <Field label="Cú pháp nội dung chuyển khoản">
          <input value={form.syntax} onChange={(e) => setForm({ ...form, syntax: upper(e.target.value) })} required maxLength={40} className="field uppercase" />
        </Field>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          Chèn:
          {['[TEN]', '[KY]'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, syntax: `${form.syntax} ${t}`.trim() })}
              className="press rounded-lg border border-white/10 bg-card2 px-2 py-1 font-semibold text-white"
            >
              {t}
            </button>
          ))}
          → <b className="text-white">{sample}</b>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-deep p-3">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1">
            {valid ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vietQrImageUrl(bank, 0, sample)} alt="Xem trước VietQR" className="size-full object-contain" />
            ) : (
              <QrCode className="size-8 text-slate-400" aria-hidden />
            )}
          </div>
          <div className="min-w-0 text-xs">
            <div className="text-slate-400">Xem trước</div>
            <div className="font-bold">{bankName(form.bin)}</div>
            <div className="tabular-nums">{form.accountNo || '—'}</div>
            <div className="truncate text-slate-400">{form.owner || '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="dark" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" variant="lime" disabled={!valid || pending}>
            Lưu
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/** Cài đặt chung: tên CLB, đơn giá cố định, ngưỡng "chơi ít" */
export function GeneralSheet({ open, onOpenChange }: SheetProps) {
  const { settings } = useClub();
  const [form, setForm] = useState({ clubName: settings.clubName, fixedRate: settings.fixedRate, minSessions: settings.minSessions });
  const { pending, run } = useServerAction();

  useEffect(() => {
    if (open) setForm({ clubName: settings.clubName, fixedRate: settings.fixedRate, minSessions: settings.minSessions });
  }, [open, settings]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Cài đặt chung">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateGeneralSettings(form), { success: 'Đã lưu cài đặt', onSuccess: () => onOpenChange(false) });
        }}
      >
        <Field label="Tên CLB">
          <input value={form.clubName} onChange={(e) => setForm({ ...form, clubName: e.target.value })} required maxLength={60} className="field" />
        </Field>
        <Field label="Đơn giá cố định mỗi trận thua (phương án 2)" hint="Áp dụng cho kỳ đang mở và các kỳ sau.">
          <MoneyInput value={form.fixedRate} onValueChange={(fixedRate) => setForm({ ...form, fixedRate })} />
        </Field>
        <Field label='Ngưỡng "chơi ít" (gợi ý không chia phần hụt)'>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={form.minSessions}
            onChange={(e) => setForm({ ...form, minSessions: Number(e.target.value) || 1 })}
            className="field"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="dark" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" variant="lime" disabled={pending}>
            Lưu
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/** Sao lưu: tải file JSON toàn bộ dữ liệu (chỉ Quản trị viên) */
export function BackupSheet({ open, onOpenChange }: SheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Sao lưu dữ liệu">
      <div className="space-y-3">
        <p className="text-sm text-slate-400">
          File JSON gồm thành viên, sân, buổi chơi, kết quả, thu chi, thanh toán, cấu hình và các kỳ đã đóng (không gồm ảnh đại diện).
        </p>
        <Button variant="lime" className="w-full" asChild>
          <a href="/api/backup" download>
            <Download className="size-5" />
            Tải file sao lưu
          </a>
        </Button>
        <p className="text-xs text-slate-400">
          Khôi phục: dùng tính năng Backups / Point-in-Time Recovery trong Supabase Dashboard để đảm bảo toàn vẹn dữ liệu và quyền truy cập.
        </p>
      </div>
    </Sheet>
  );
}

/** Thông báo: Web Push trên thiết bị này + tuỳ chọn banner realtime và rung */
export function NotifySheet({ open, onOpenChange }: SheetProps) {
  const [banner, setBanner] = useLocalPref('banner', true);
  const [haptic, setHaptic] = useLocalPref('haptic', true);
  const [push, setPush] = useState<'unsupported' | 'off' | 'on' | 'busy'>('off');

  useEffect(() => {
    if (!open) return;
    if (!pushSupported()) {
      setPush('unsupported');
      return;
    }
    void currentSubscription().then((s) => setPush(s && Notification.permission === 'granted' ? 'on' : 'off'));
  }, [open]);

  async function togglePush(next: boolean) {
    setPush('busy');
    try {
      if (next) {
        const res = await savePushSubscription(toSubscriptionInput(await subscribePush()));
        if (!res.ok) throw new Error(res.error);
        setPush('on');
        toast.success('Đã bật thông báo trên thiết bị này');
      } else {
        const sub = await currentSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setPush('off');
        toast.success('Đã tắt thông báo trên thiết bị này');
      }
    } catch (e) {
      setPush(next ? 'off' : 'on');
      toast.error(e instanceof Error ? e.message : 'Không thay đổi được thông báo');
    }
  }

  const rows: { key: string; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }[] = [
    {
      key: 'push',
      title: 'Thông báo đẩy',
      desc:
        push === 'unsupported'
          ? 'Thiết bị chưa hỗ trợ — trên iPhone hãy "Thêm vào Màn hình chính" trước'
          : 'Buổi chơi bắt đầu, xác nhận thanh toán, chốt kỳ…',
      checked: push === 'on',
      onChange: (v) => void togglePush(v),
      disabled: push === 'unsupported' || push === 'busy',
    },
    { key: 'banner', title: 'Banner realtime', desc: 'Hiện khi máy khác ghi trận thua', checked: banner, onChange: setBanner },
    { key: 'haptic', title: 'Rung khi bấm', desc: 'Phản hồi rung trên điện thoại', checked: haptic, onChange: setHaptic },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Thông báo">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-card px-4 py-3">
            {r.key === 'push' ? <BellRing className="size-5 shrink-0 text-lime" aria-hidden /> : null}
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{r.title}</div>
              <div className="text-xs text-slate-400">{r.desc}</div>
            </div>
            <Switch checked={r.checked} onCheckedChange={r.onChange} label={r.title} disabled={r.disabled} />
          </div>
        ))}
        <Button variant="lime" className="w-full" onClick={() => onOpenChange(false)}>
          Xong
        </Button>
      </div>
    </Sheet>
  );
}
