import type { MetadataRoute } from 'next';

/** Web App Manifest — cho phép "Thêm vào Màn hình chính" (PWA, cần cho Web Push trên iOS) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dalton Pickleball',
    short_name: 'Dalton',
    description: 'Lịch chơi, ghi trận thua, chia tiền và thanh toán VietQR cho CLB Dalton Pickleball.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08111F',
    theme_color: '#08111F',
    lang: 'vi',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
