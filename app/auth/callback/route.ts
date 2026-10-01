import { NextResponse, type NextRequest } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPush } from '@/lib/push';

/**
 * Google OAuth trả về đây kèm ?code=… → đổi lấy phiên đăng nhập.
 * Người mới (đang chờ duyệt) → thông báo cho Quản trị viên.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=auth`);

  const { data: profile } = await supabase.from('profiles').select('status, display_name, created_at').eq('id', data.user.id).single();

  if (profile?.status === 'pending') {
    // Chỉ báo 1 lần: hồ sơ vừa được tạo trong vòng 2 phút
    const justCreated = Date.now() - new Date(profile.created_at).getTime() < 120_000;
    if (justCreated) {
      after(() =>
        sendPush({ roles: ['admin'] }, { title: 'Đăng ký mới', body: `${profile.display_name} đang chờ duyệt vào CLB`, url: '/admin', tag: 'signup' }),
      );
    }
    return NextResponse.redirect(`${origin}/pending`);
  }
  if (profile?.status === 'rejected') return NextResponse.redirect(`${origin}/pending`);
  return NextResponse.redirect(`${origin}/`);
}
