import 'server-only';
import { cache } from 'react';
import type { AppRole } from '@/types/database';
import type { CurrentMember } from '@/types/app';
import { createClient } from '@/lib/supabase/server';

/**
 * Thành viên đang đăng nhập (cache trong 1 request), null nếu chưa đăng nhập.
 * getClaims() xác thực chữ ký JWT ngay tại server (khoá bất đối xứng của Supabase)
 * → không tốn thêm 1 lượt gọi tới Supabase Auth như getUser().
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, status, skill')
    .eq('id', userId)
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

export function hasRole(me: Pick<CurrentMember, 'role'>, roles: readonly AppRole[]): boolean {
  return roles.includes(me.role);
}
