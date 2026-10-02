# Dalton Pickleball

Ứng dụng web (PWA) cho CLB Dalton Pickleball: lịch chơi, điểm danh, ghi trận thua realtime, chia tiền 2 phương án, thanh toán VietQR, đóng kỳ / xem lại theo tháng, bảng xếp hạng và quản trị thành viên.

**Công nghệ:** Next.js 15 (App Router, Server Components, Server Actions) · React 19 · TypeScript strict · Tailwind CSS + shadcn/ui (Radix) · Supabase (Auth Google, Postgres + RLS, Realtime, Storage) · Web Push (VAPID).

---

## 1. Cấu trúc thư mục

```
app/
  (auth)/login, pending        Đăng nhập Google · màn chờ duyệt
  (app)/                       Khu vực thành viên (header + bottom nav)
    page.tsx                   Home: buổi đang diễn ra, ghi trận thua, ví "Tôi kỳ này"
    court/                     Sân đấu: dải ngày, lịch, chi tiết buổi, chia đội tính chấp
    payments/                  Thanh toán: phương án chia, kết quả, VietQR, thu chi, đóng kỳ, PDF
    leaderboard/               Bảng xếp hạng theo tháng (thua trận / tham gia)
    admin/                     Quản trị: thành viên, duyệt, sân, chi phí, VietQR, sao lưu, thông báo
  auth/callback, auth/signout  OAuth callback · đăng xuất (POST)
  api/backup                   Tải file sao lưu JSON (chỉ Quản trị viên)
actions/                       Server Actions (kiểm tra zod + quyền + RPC)
components/                    UI theo màn (home, court, payments, leaderboard, admin, session, shell…)
hooks/                         use-session-scoring (optimistic), use-haptics, use-local-pref…
lib/                           Logic thuần (settlement, handicap, vietqr, snapshot…) + lớp dữ liệu
supabase/migrations            Toàn bộ schema, RLS, RPC, Realtime, Storage
supabase/seed.sql              Cấu hình CLB, sân mặc định, kỳ đầu tiên
tests/                         Unit test (vitest) cho công thức chia tiền, chấp, VietQR, snapshot
```

## 2. Chạy trên máy

Yêu cầu Node.js ≥ 20.9.

```bash
npm install
cp .env.example .env.local      # rồi điền giá trị (mục 3)
npm run typecheck && npm test   # kiểm tra kiểu + unit test
npm run dev                     # http://localhost:3000
```

## 3. Tạo Supabase

1. Tạo project tại <https://supabase.com> (region Singapore cho độ trễ thấp từ Việt Nam).
2. **SQL Editor** → dán và chạy lần lượt:
   - `supabase/migrations/20261001000000_init.sql`
   - `supabase/seed.sql`
   - `supabase/migrations/20261002000000_preapproved_emails.sql`
   - `supabase/migrations/20261002010000_performance.sql`

   (Hoặc dùng CLI: `npx supabase init` → `npx supabase link --project-ref <ref>` → `npx supabase db push`, sau đó chạy `seed.sql` trong SQL Editor.)
3. **Project Settings → API**: copy `URL`, `anon key`, `service_role key` vào `.env.local`.
4. **Authentication → Sign In / Providers → Google**: bật Google, nhập Client ID / Secret (mục 4).
5. **Authentication → URL Configuration**:
   - Site URL: `https://<tên-miền-của-bạn>`
   - Redirect URLs: thêm `http://localhost:3000/auth/callback` và `https://<tên-miền-của-bạn>/auth/callback`

> **Người đăng nhập đầu tiên** tự động trở thành **Quản trị viên** (đã duyệt). Mọi người sau đó vào trạng thái *chờ duyệt* — Quản trị viên duyệt trong **Quản trị → Quản lý thành viên → Thêm**.

## 4. Tạo Google OAuth

1. <https://console.cloud.google.com> → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy Client ID / Client Secret vào Supabase (bước 3.4).

## 5. Web Push (thông báo đẩy)

```bash
npm run vapid
```

Điền `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (dạng `mailto:email-cua-ban`). Nếu bỏ trống, ứng dụng vẫn chạy bình thường, chỉ không gửi thông báo đẩy.

Thành viên bật thông báo tại **Quản trị → Thông báo**. Trên iPhone (iOS ≥ 16.4) cần mở Safari → Chia sẻ → **Thêm vào Màn hình chính** trước, rồi mở app từ màn hình chính.

Thông báo được gửi khi: có đăng ký mới (Quản trị viên), tài khoản được duyệt, buổi chơi bắt đầu, thành viên báo đã chuyển khoản (Kế toán), Kế toán xác nhận / từ chối, đóng kỳ.

## 6. Triển khai Vercel

> `vercel.json` đặt máy chủ ứng dụng ở **Singapore (sin1)**, cùng khu vực Supabase (ap-southeast-1) — phải cùng khu vực với Supabase. Nếu Supabase ở khu vực khác, sửa `regions` cho khớp (Sydney: `syd1`, Tokyo: `hnd1`, Mỹ: `iad1`).

1. Push code lên GitHub → **Vercel → Add New Project** → chọn repo (Framework: Next.js, giữ mặc định).
2. **Environment Variables**: thêm đủ các biến trong `.env.example`.
3. Deploy, rồi cập nhật Site URL / Redirect URLs trong Supabase theo tên miền Vercel (mục 3.5).

## 7. Phân quyền

| Vai trò | Quyền |
|---|---|
| Quản trị viên | Toàn quyền: duyệt / khoá thành viên, vai trò, trình độ, sân, cài đặt chung, sao lưu, mọi quyền bên dưới |
| Kế toán (duy nhất 1 người) | Phương án chia, thu chi khác, xác nhận thanh toán, VietQR, đóng kỳ, sửa chi phí buổi |
| Ghi kèo | Tạo / bắt đầu / kết thúc / mở lại / huỷ buổi, điểm danh, ghi trận thua, sửa chi phí buổi |
| Thành viên | Xem toàn bộ, thanh toán VietQR, báo "Tôi đã chuyển", sửa hồ sơ của mình |

Quyền được kiểm tra **3 lớp**: giao diện (ẩn nút) → Server Action (zod + vai trò) → **Postgres RLS / RPC SECURITY DEFINER** (lớp quyết định cuối cùng; client không thể vượt qua dù gọi API trực tiếp).

## 8. Quy tắc nghiệp vụ chính

- **Chạm tên** = có mặt (0 trận thua) ↔ vắng. Không thể đánh vắng người đang có trận thua. Bấm **(+)** tự đánh dấu có mặt.
- Chỉ **1 buổi đang diễn ra** tại một thời điểm; bắt đầu buổi tự đặt ngày = hôm nay (giờ Việt Nam).
- **Chi phí sân + nước** của mỗi buổi do Kế toán ứng.
- **Phương án 1:** Phải gánh = trận thua × (Tổng chi phí ÷ tổng trận thua).
- **Phương án 2:** Phải gánh = trận thua × đơn giá cố định + phần hụt chia đều (trừ người trong danh sách loại trừ).
- Tổng chi phí = sân + nước + khoản chi khác − khoản thu khác. Phải gánh làm tròn lên 1.000đ.
- **Net = Phải gánh − Đã ứng** (dương: chuyển cho Kế toán · âm: được nhận lại).
- Thanh toán 2 bước: thành viên báo đã chuyển → *Chờ xác nhận* → Kế toán xác nhận.
- **Đóng kỳ:** server tính lại toàn bộ và lưu snapshot bất biến; buổi chưa chơi chuyển sang kỳ mới; xem lại kỳ cũ bằng ô chọn tháng (Thanh toán, Bảng xếp hạng) và xuất PDF.
- **Tính chấp:** trình độ −3…+3; chênh 1 điểm tổng trình = 1 trái.

## 9. Sao lưu & khôi phục

- **Quản trị → Sao lưu dữ liệu** tải file JSON toàn bộ dữ liệu nghiệp vụ.
- Khôi phục dùng **Supabase Dashboard → Database → Backups** (bản sao hằng ngày, gói Pro có Point-in-Time Recovery) để đảm bảo toàn vẹn khoá ngoại, RLS và tài khoản đăng nhập.

## 10. Lệnh hữu ích

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Chạy môi trường phát triển |
| `npm run build && npm start` | Build & chạy production |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm test` | Unit test |
| `npm run db:types` | Sinh lại kiểu Supabase (sau khi `supabase link`) để đối chiếu `types/database.ts` |
| `npm run vapid` | Tạo cặp khoá VAPID |
