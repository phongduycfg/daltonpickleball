-- =====================================================================
-- Dữ liệu khởi tạo bắt buộc: cấu hình CLB, sân mặc định, kỳ đầu tiên.
-- Chạy SAU tất cả file trong supabase/migrations (supabase db reset tự chạy theo đúng thứ tự).
-- =====================================================================
insert into public.club_settings (id) values (true) on conflict (id) do nothing;

insert into public.venues (name, area, default_cost, sort_order) values
  ('Sân Hà Đô Charm Villas', 'Nam Từ Liêm, Hà Nội', 850000, 1),
  ('Sân Pickle Park', 'Cầu Giấy, Hà Nội', 700000, 2)
on conflict do nothing;

-- Kỳ 1 bắt đầu từ hôm nay (giờ Việt Nam); số kỳ tự tăng khi đóng kỳ
insert into public.periods (fixed_rate)
select 30000
where not exists (select 1 from public.periods where closed_at is null);
