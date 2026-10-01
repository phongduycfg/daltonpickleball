/**
 * Thu nhỏ ảnh đại diện ngay trên trình duyệt trước khi tải lên:
 * cắt vuông giữa ảnh, 256×256, định dạng WebP (~15–30KB) → tải nhanh trên 4G.
 */
export async function resizeAvatar(file: File, size = 256): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Vui lòng chọn file ảnh');
  if (file.size > 15 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 15MB)');

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
  if (blob && blob.type === 'image/webp') return blob;
  // Safari cũ không xuất được WebP → dùng JPEG
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!jpeg) throw new Error('Không xử lý được ảnh');
  return jpeg;
}
