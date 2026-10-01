-- =====================================================================
-- Dữ liệu khởi tạo bắt buộc: cấu hình CLB, sân mặc định, kỳ đang mở.
-- Chạy 1 lần sau migration (supabase db reset tự chạy file này).
-- =====================================================================
insert into public.club_settings (id) values (true) on conflict (id) do nothing;

insert into public.venues (name, area, default_cost, sort_order) values
  ('Sân Hà Đô Charm Villas', 'Nam Từ Liêm, Hà Nội', 850000, 1),
  ('Sân Pickle Park', 'Cầu Giấy, Hà Nội', 700000, 2)
on conflict do nothing;

-- Kỳ đang mở = tháng hiện tại theo giờ Việt Nam
insert into public.periods (year, month, fixed_rate)
select extract(year from public.vn_today())::smallint, extract(month from public.vn_today())::smallint, 30000
where not exists (select 1 from public.periods where closed_at is null);
