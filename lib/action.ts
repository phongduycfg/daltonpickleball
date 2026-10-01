import 'server-only';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ZodError } from 'zod';
import type { AppRole } from '@/types/database';
import type { CurrentMember } from '@/types/app';
import { getCurrentMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/** Kết quả chuẩn của mọi Server Action */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export class ActionError extends Error {}

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

/** Chuyển lỗi Postgres/Zod/khác thành thông điệp tiếng Việt hiển thị cho người dùng */
export function toActionError(e: unknown): { ok: false; error: string } {
  if (e instanceof ActionError) return { ok: false, error: e.message };
  if (e && typeof e === 'object' && 'issues' in e) {
    const issue = (e as ZodError).issues[0];
    return { ok: false, error: issue?.message ?? 'Dữ liệu không hợp lệ' };
  }
  if (e && typeof e === 'object' && 'code' in e) {
    const pg = e as PostgrestError;
    if (pg.code === '42501') return { ok: false, error: 'Bạn không có quyền thực hiện thao tác này' };
    if (pg.code === 'P0001' && pg.message) return { ok: false, error: pg.message };
    if (pg.code === '23505') return { ok: false, error: 'Dữ liệu bị trùng' };
    if (pg.code === '23514') return { ok: false, error: 'Giá trị không hợp lệ' };
  }
  console.error('[action]', e);
  return { ok: false, error: 'Có lỗi xảy ra, vui lòng thử lại' };
}

/**
 * Khởi tạo ngữ cảnh cho Server Action: kiểm tra đăng nhập, đã duyệt và vai trò.
 * (Phân quyền lặp lại ở RLS/RPC phía database — đây là lớp chặn sớm cho UX.)
 */
export async function actionContext(roles?: readonly AppRole[]): Promise<{ me: CurrentMember; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const me = await getCurrentMember();
  if (!me || me.status !== 'active') throw new ActionError('Phiên đăng nhập không hợp lệ');
  if (roles && !roles.includes(me.role)) throw new ActionError('Bạn không có quyền thực hiện thao tác này');
  return { me, supabase: await createClient() };
}

/** Ném lỗi Postgrest nếu có */
export function check<T extends { error: PostgrestError | null }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}
