'use client';

import type { PostgrestError } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Ghi kèo gọi THẲNG RPC Postgres từ trình duyệt (1 lượt mạng tới Supabase),
 * không đi vòng qua server Next.js. An toàn vì RPC tự kiểm tra quyền theo JWT
 * của người dùng (SECURITY DEFINER + assert_role) và mọi bảng đều có RLS.
 */
function messageOf(e: PostgrestError): string {
  if (e.code === '42501') return 'Bạn không có quyền thực hiện thao tác này';
  if (e.code === 'P0001') return e.message;
  return 'Không lưu được — kiểm tra kết nối mạng';
}

export async function rpcAdjustLoss(sessionId: string, memberId: string, delta: 1 | -1): Promise<{ ok: true; losses: number } | { ok: false; error: string }> {
  const { data, error } = await getBrowserClient().rpc('adjust_loss', { p_session: sessionId, p_member: memberId, p_delta: delta });
  if (error) return { ok: false, error: messageOf(error) };
  return { ok: true, losses: data ?? 0 };
}

export async function rpcSetAttendance(sessionId: string, memberId: string, present: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await getBrowserClient().rpc('set_attendance', { p_session: sessionId, p_member: memberId, p_present: present });
  if (error) return { ok: false, error: messageOf(error) };
  return { ok: true };
}
