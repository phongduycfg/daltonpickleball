'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/shared/money-input';
import { Field, SelectField } from '@/components/shared/select-field';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { createSession } from '@/actions/session';

/**
 * Thêm buổi chơi (ngày · giờ · sân · chi phí).
 * Chọn ngày đã qua → nhập bù buổi đã chơi: tạo ở trạng thái "Đã kết thúc" và mở luôn để ghi điểm danh, trận thua.
 */
export function NewSessionSheet({
  open,
  onOpenChange,
  defaultDate,
  today,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
  today: string;
  onCreated: (session: { id: string; date: string; past: boolean }) => void;
}) {
  const { venues, period } = useClub();
  const active = venues.filter((v) => v.isActive);
  const first = active[0];
  const [form, setForm] = useState({ date: defaultDate, start: '17:00', end: '19:00', venueId: first?.id ?? '', cost: first?.defaultCost ?? 0 });
  const { pending, run } = useServerAction();
  const past = form.date < today;

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, date: defaultDate, venueId: f.venueId || first?.id || '', cost: f.venueId ? f.cost : first?.defaultCost ?? 0 }));
  }, [open, defaultDate, first?.id, first?.defaultCost]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={past ? 'Nhập bù buổi đã chơi' : 'Thêm buổi chơi'}>
      {active.length ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createSession({ periodId: period.id, ...form }), {
              success: past ? 'Đã thêm buổi — điểm danh và ghi trận thua bên dưới' : 'Đã thêm lịch',
              onSuccess: (s) => {
                onOpenChange(false);
                onCreated({ id: s.id, date: form.date, past: s.past });
              },
            });
          }}
        >
          <Field label="Ngày">
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field" />
          </Field>
          {past ? (
            <p className="flex items-start gap-2 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-200">
              <History className="mt-0.5 size-4 shrink-0" aria-hidden />
              Ngày đã qua: buổi sẽ được tạo ở trạng thái Đã kết thúc để bạn điểm danh và ghi trận thua ngay. Chỉ nhập bù được trong kỳ đang mở.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Bắt đầu">
              <input type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="field" />
            </Field>
            <Field label="Kết thúc">
              <input type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="field" />
            </Field>
          </div>
          <Field label="Sân">
            <SelectField
              value={form.venueId}
              onChange={(e) => {
                const v = active.find((x) => x.id === e.target.value);
                setForm({ ...form, venueId: e.target.value, cost: v?.defaultCost ?? form.cost });
              }}
            >
              {active.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label={past ? 'Chi phí sân + nước' : 'Chi phí sân + nước (dự kiến)'}>
            <MoneyInput value={form.cost} onValueChange={(cost) => setForm({ ...form, cost })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="dark" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="lime" disabled={pending}>
              {past ? 'Thêm buổi đã chơi' : 'Thêm lịch'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl bg-deep p-4 text-sm text-slate-300">Chưa có sân đang hoạt động — Quản trị viên thêm sân trong tab Quản trị.</p>
      )}
    </Sheet>
  );
}
