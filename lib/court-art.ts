/**
 * Ảnh nền sân pickleball (WebP tĩnh trong /public/court, ~5–9KB mỗi ảnh).
 * Ảnh tĩnh được trình duyệt giải mã 1 lần và cache lâu dài — nhẹ hơn nhiều so với
 * SVG có hiệu ứng làm mờ (blur) phải vẽ lại liên tục khi cuộn trên điện thoại.
 * `tone` đổi tông trời theo sân, `withGear` có thêm vợt + bóng (thẻ buổi chơi ở Home).
 */
export function courtBackground(tone: number, withGear = false): string {
  return `url("/court/court-${tone % 2}-${withGear ? 'gear' : 'plain'}.webp")`;
}

/** Chọn tông ổn định cho mỗi sân theo thứ tự trong danh sách */
export function venueTone(venueId: string, venues: readonly { id: string }[]): number {
  return Math.max(0, venues.findIndex((v) => v.id === venueId));
}
