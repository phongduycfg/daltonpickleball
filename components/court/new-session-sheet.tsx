'use client';

import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/shared/money-input';
import { Field, SelectField } from '@/components/shared/select-field';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { createSession } from '@/actions/session';

/** Thêm lịch chơi (ngày · giờ · sân · chi phí dự kiến) */
export function NewSessionSheet({ open, onOpenChange, defaultDate }: { open: boolean; onOpenChange: (v: boolean) => void; defaultDate: string }) {
  const { venues, period } = useClub();
  const active = venues.filter((v) => v.isActive);
  const first = active[0];
  const [form, setForm] = useState({ date: defaultDate, start: '17:00', end: '19:00', venueId: first?.id ?? '', cost: first?.defaultCost ?? 0 });
  const { pending, run } = useServerAction();

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, date: defaultDate, venueId: f.venueId || first?.id || '', cost: f.venueId ? f.cost : first?.defaultCost ?? 0 }));
  }, [open, defaultDate, first?.id, first?.defaultCost]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Thêm buổi chơi">
      {active.length ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createSession({ periodId: period.id, ...form }), { success: 'Đã thêm lịch', onSuccess: () => onOpenChange(false) });
          }}
        >
          <Field label="Ngày">
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field" />
          </Field>
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
          <Field label="Chi phí sân + nước (dự kiến)">
            <MoneyInput value={form.cost} onValueChange={(cost) => setForm({ ...form, cost })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="dark" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="lime" disabled={pending}>
              Thêm lịch
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl bg-deep p-4 text-sm text-slate-300">Chưa có sân đang hoạt động — Quản trị viên thêm sân trong tab Quản trị.</p>
      )}
    </Sheet>
  );
}
