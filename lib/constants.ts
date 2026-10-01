import type { AppRole } from '@/types/database';

/** Nhãn & màu theo vai trò (dùng thống nhất toàn app) */
export const ROLE_META: Record<AppRole, { label: string; short: string; pill: string; badge: string }> = {
  admin: { label: 'Quản trị viên', short: 'Quản trị', pill: 'bg-emerald-500/15 text-emerald-300', badge: 'bg-yellow-300 text-ink' },
  accountant: { label: 'Kế toán', short: 'Kế toán', pill: 'bg-sky-500/15 text-sky-300', badge: 'bg-sky-400 text-ink' },
  scorer: { label: 'Ghi kèo', short: 'Ghi kèo', pill: 'bg-violet-500/15 text-violet-300', badge: 'bg-violet-400 text-ink' },
  member: { label: 'Thành viên', short: 'Thành viên', pill: 'bg-white/10 text-slate-300', badge: 'bg-slate-300 text-ink' },
};

export const ROLE_ORDER: Record<AppRole, number> = { admin: 0, accountant: 1, scorer: 2, member: 3 };

/** Nhóm quyền */
export const SCORER_ROLES: readonly AppRole[] = ['admin', 'scorer'];
export const FINANCE_ROLES: readonly AppRole[] = ['admin', 'accountant'];
export const COST_ROLES: readonly AppRole[] = ['admin', 'scorer', 'accountant'];

export const canScore = (role: AppRole) => SCORER_ROLES.includes(role);
export const canFinance = (role: AppRole) => FINANCE_ROLES.includes(role);
export const canEditCost = (role: AppRole) => COST_ROLES.includes(role);

/** Ngân hàng hỗ trợ VietQR (mã BIN Napas) */
export const BANKS = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970405', name: 'Agribank' },
  { bin: '970441', name: 'VIB' },
] as const;

/** Bảng màu avatar chữ cái (khi chưa có ảnh) — gán ổn định theo id */
export const AVATAR_GRADIENTS = [
  'from-[#ECFCCB] to-[#A3E635]',
  'from-sky-300 to-sky-500',
  'from-amber-200 to-orange-300',
  'from-pink-300 to-rose-400',
  'from-violet-300 to-purple-400',
  'from-emerald-200 to-teal-400',
  'from-cyan-200 to-cyan-400',
  'from-yellow-200 to-yellow-400',
  'from-fuchsia-300 to-pink-400',
  'from-indigo-300 to-indigo-400',
  'from-red-300 to-orange-300',
  'from-teal-200 to-emerald-300',
] as const;
