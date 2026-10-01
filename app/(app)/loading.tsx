/** Khung xương khi chuyển tab (hiện ngay, tránh màn hình trắng trên 4G) */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải">
      <div className="h-7 w-40 animate-pulse rounded-xl bg-card" />
      <div className="h-56 animate-pulse rounded-3xl bg-card" />
      <div className="h-40 animate-pulse rounded-3xl bg-card" />
      <div className="h-24 animate-pulse rounded-3xl bg-card" />
    </div>
  );
}
