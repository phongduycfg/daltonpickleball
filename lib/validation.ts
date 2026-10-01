import { z } from 'zod';

/** Schema kiểm tra đầu vào cho Server Actions (không tin dữ liệu từ client) */
export const uuid = z.string().uuid({ message: 'Mã không hợp lệ' });
export const money = z.number({ invalid_type_error: 'Số tiền không hợp lệ' }).int().min(0).max(2_000_000_000);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ');

export const createSessionSchema = z
  .object({ periodId: uuid, venueId: uuid, date, start: time, end: time, cost: money })
  .refine((v) => v.end > v.start, { message: 'Giờ kết thúc phải sau giờ bắt đầu' });

export const ledgerItemSchema = z.object({
  periodId: uuid,
  kind: z.enum(['expense', 'income']),
  description: z.string().trim().min(1, 'Nhập ghi chú').max(120, 'Ghi chú tối đa 120 ký tự'),
  amount: money.min(1, 'Số tiền phải lớn hơn 0'),
  memberId: uuid,
});

export const venueSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, 'Nhập tên sân').max(80),
  area: z.string().trim().max(80),
  defaultCost: money,
  isActive: z.boolean(),
});

export const memberUpdateSchema = z.object({
  memberId: uuid,
  role: z.enum(['admin', 'accountant', 'scorer', 'member']),
  status: z.enum(['pending', 'active', 'rejected']),
  skill: z.number().int().min(-3).max(3),
});

export const bankSettingsSchema = z.object({
  bin: z.string().regex(/^\d{6}$/, 'Chọn ngân hàng'),
  accountNo: z.string().regex(/^\d{6,19}$/, 'Số tài khoản gồm 6–19 chữ số'),
  owner: z.string().trim().min(3, 'Nhập tên chủ tài khoản').max(60),
  syntax: z.string().trim().min(3).max(40),
});

export const generalSettingsSchema = z.object({
  clubName: z.string().trim().min(2).max(60),
  fixedRate: money.min(1000, 'Đơn giá tối thiểu 1,000đ'),
  minSessions: z.number().int().min(1).max(31),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Tên không được để trống').max(40),
  avatarUrl: z.string().url().nullable(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});
