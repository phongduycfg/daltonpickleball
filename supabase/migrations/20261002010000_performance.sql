-- =====================================================================
-- Tối ưu hiệu năng
-- 1) RLS: bọc hàm kiểm tra quyền trong (select …) để Postgres tính 1 lần
--    cho cả câu truy vấn thay vì lặp lại trên từng dòng.
-- 2) app_snapshot(): trả toàn bộ dữ liệu 1 màn hình trong 1 lần gọi
--    (thay cho 6–7 truy vấn nối tiếp nhau). Chạy với quyền của người gọi
--    (SECURITY INVOKER) → vẫn áp dụng đầy đủ RLS.
-- =====================================================================

-- ---------- 1. RLS: chính sách đọc ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_member()));

drop policy if exists club_settings_select     on public.club_settings;
drop policy if exists venues_select            on public.venues;
drop policy if exists periods_select           on public.periods;
drop policy if exists sessions_select          on public.sessions;
drop policy if exists session_results_select   on public.session_results;
drop policy if exists ledger_items_select      on public.ledger_items;
drop policy if exists period_exclusions_select on public.period_exclusions;
drop policy if exists payments_select          on public.payments;

create policy club_settings_select     on public.club_settings     for select to authenticated using ((select public.is_member()));
create policy venues_select            on public.venues            for select to authenticated using ((select public.is_member()));
create policy periods_select           on public.periods           for select to authenticated using ((select public.is_member()));
create policy sessions_select          on public.sessions          for select to authenticated using ((select public.is_member()));
create policy session_results_select   on public.session_results   for select to authenticated using ((select public.is_member()));
create policy ledger_items_select      on public.ledger_items      for select to authenticated using ((select public.is_member()));
create policy period_exclusions_select on public.period_exclusions for select to authenticated using ((select public.is_member()));
create policy payments_select          on public.payments          for select to authenticated using ((select public.is_member()));

-- ---------- 2. Ảnh chụp dữ liệu cho 1 lượt hiển thị ----------
create or replace function public.app_snapshot()
returns jsonb
language sql stable security invoker set search_path = public as $$
  with open_period as (
    select id from public.periods where closed_at is null limit 1
  )
  select jsonb_build_object(
    'me', (
      select to_jsonb(p) from (
        select id, email, display_name, avatar_url, role, status, skill
        from public.profiles where id = auth.uid()
      ) p
    ),
    'settings', (
      select to_jsonb(s) from (
        select club_name, fixed_rate, min_sessions, bank_bin, bank_account_no, bank_owner, transfer_syntax
        from public.club_settings limit 1
      ) s
    ),
    'members', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.display_name)
      from (select id, email, display_name, avatar_url, role, skill from public.profiles where status = 'active') m
    ), '[]'::jsonb),
    'venues', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.sort_order, v.created_at)
      from (select id, name, area, default_cost, is_active, sort_order, created_at from public.venues) v
    ), '[]'::jsonb),
    'periods', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.year desc, p.month desc)
      from (select id, year, month, plan, fixed_rate, closed_at, snapshot is not null as has_snapshot from public.periods) p
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(
        to_jsonb(s) || jsonb_build_object('results', coalesce((
          select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'losses', r.losses))
          from public.session_results r where r.session_id = s.id
        ), '[]'::jsonb))
        order by s.play_date, s.start_time)
      from (
        select id, period_id, venue_id, play_date, start_time, end_time, cost, status, seq, started_at
        from public.sessions where period_id = (select id from open_period)
      ) s
    ), '[]'::jsonb),
    'ledger', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.created_at)
      from (select id, kind, description, amount, member_id, created_at from public.ledger_items
            where period_id = (select id from open_period)) l
    ), '[]'::jsonb),
    'excluded', coalesce((
      select jsonb_agg(e.member_id) from public.period_exclusions e where e.period_id = (select id from open_period)
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_object_agg(pm.member_id, pm.status) from public.payments pm where pm.period_id = (select id from open_period)
    ), '{}'::jsonb)
  )
$$;

revoke execute on function public.app_snapshot() from public, anon;
grant execute on function public.app_snapshot() to authenticated;
