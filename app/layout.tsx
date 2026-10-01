import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

/** Font Be Vietnam Pro tự host (next/font) — hiển thị tiếng Việt chuẩn, không chặn render */
const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: { default: 'Dalton Pickleball', template: '%s · Dalton Pickleball' },
  description: 'Ứng dụng CLB Dalton Pickleball: lịch chơi, ghi trận thua, chia tiền và thanh toán VietQR.',
  applicationName: 'Dalton Pickleball',
  appleWebApp: { capable: true, title: 'Dalton', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  // apple-touch-icon lấy tự động từ app/apple-icon.png
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#08111F',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={font.variable}>
      <body className="font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
