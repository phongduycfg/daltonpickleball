import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/** Đường dẫn không cần đăng nhập */
const PUBLIC_PATHS = ['/login', '/auth/callback'];

/**
 * Làm mới phiên Supabase trên mỗi request và chặn người chưa đăng nhập.
 * (Kiểm tra trạng thái duyệt/vai trò thực hiện ở layout & server action.)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Thiếu cấu hình → báo rõ thay vì để middleware sập với lỗi khó hiểu
  if (!url || !anonKey) {
    return new NextResponse('Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY trên máy chủ.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims(): làm mới phiên khi token sắp hết hạn và xác thực chữ ký JWT ngay tại server
  // (không tin cookie mù quáng, nhưng cũng không tốn 1 lượt gọi Supabase Auth mỗi request như getUser()).
  const { data: auth } = await supabase.auth.getClaims();
  const user = auth?.claims.sub ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (user && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return response;
}
