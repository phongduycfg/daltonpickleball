import type { MetadataRoute } from 'next';

/** Ứng dụng nội bộ CLB — không cho công cụ tìm kiếm lập chỉ mục */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
