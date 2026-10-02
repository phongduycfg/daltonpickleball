import type { NextConfig } from 'next';

/**
 * Cấu hình Next.js
 * - Header bảo mật áp dụng cho mọi route.
 * - CSP chỉ cho phép kết nối tới Supabase của dự án và ảnh VietQR.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : '';

const csp = [
  "default-src 'self'",
  // Next.js App Router chèn script nội tuyến để hydrate → cần 'unsafe-inline'
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://img.vietqr.io https://${supabaseHost} https://lh3.googleusercontent.com`,
  "font-src 'self'",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: 'https' as const, hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : []),
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    // Gói icon lớn: chỉ bundle icon thực sự dùng
    optimizePackageImports: ['lucide-react'],
    // Giữ trang đã tải trong bộ nhớ trình duyệt → chuyển tab qua lại tức thì, không gọi lại server.
    // Dữ liệu vẫn luôn mới nhờ Realtime (tự làm mới khi có thay đổi) và sau mỗi thao tác.
    staleTimes: { dynamic: 180, static: 300 },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Service worker luôn lấy bản mới nhất
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
      // Ảnh nền sân không đổi → cache 1 năm
      { source: '/court/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};

export default nextConfig;
