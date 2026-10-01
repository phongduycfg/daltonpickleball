import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AppRole } from '@/types/database';
import type { CurrentMember } from '@/types/app';
import { createClient } from '@/lib/supabase/server';

/**
 * Lấy thành viên đang đăng nhập (cache trong 1 request).
 * Trả về null nếu chưa đăng nhập.
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, status, skill')
    .eq('id', user.id)
    .single();
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.display_name,
    avatarUrl: data.avatar_url,
    role: data.role,
    skill: data.skill,
    status: data.status,
  };
});

/** Dùng trong layout/page: bắt buộc là thành viên đã được duyệt */
export async function requireMember(): Promise<CurrentMember> {
  const me = await getCurrentMember();
  if (!me) redirect('/login');
  if (me.status !== 'active') redirect('/pending');
  return me;
}

export function hasRole(me: Pick<CurrentMember, 'role'>, roles: readonly AppRole[]): boolean {
  return roles.includes(me.role);
}
