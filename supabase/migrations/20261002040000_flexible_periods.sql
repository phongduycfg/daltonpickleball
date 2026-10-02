-- =====================================================================
-- Kỳ thanh toán linh hoạt: không còn gắn với tháng dương lịch.
-- Mỗi kỳ có số thứ tự (Kỳ 1, Kỳ 2…), ngày bắt đầu và ngày kết thúc (khi đóng).
-- Đóng kỳ bất cứ lúc nào → kỳ mới bắt đầu ngay, các buổi chưa chơi chuyển sang kỳ mới.
-- =====================================================================

alter table public.periods
  add column if not exists seq        integer,
  add column if not exists start_date date,
  add column if not exists end_date   date;

-- Dữ liệu cũ: đánh số theo thứ tự mở kỳ; ngày bắt đầu = buổi chơi sớm nhất (hoặc ngày mở kỳ)
update public.periods p set
  seq = r.n,
  start_date = coalesce(
    (select min(s.play_date) from public.sessions s where s.period_id = p.id),
    (p.opened_at at time zone 'Asia/Ho_Chi_Minh')::date),
  end_date = case when p.closed_at is null then null else (p.closed_at at time zone 'Asia/Ho_Chi_Minh')::date end
from (select id, row_number() over (order by opened_at, id) as n from public.periods) r
where r.id = p.id;

alter table public.periods
  alter column seq set not null,
  alter column start_date set not null,
  alter column start_date set default public.vn_today(),
  add constraint periods_seq_key unique (seq),
  add constraint periods_dates_check check (end_date is null or end_date >= start_date);

alter table public.periods drop constraint if exists periods_year_month_key;
alter table public.periods drop column if exists year;
alter table public.periods drop column if exists month;

-- Tự gán số kỳ tiếp theo khi tạo kỳ mới
create or replace function public.next_period_seq()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.seq is null then
    new.seq := coalesce((select max(seq) from public.periods), 0) + 1;
  end if;
  return new;
end $$;

drop trigger if exists periods_next_seq on public.periods;
create trigger periods_next_seq before insert on public.periods
  for each row execute function public.next_period_seq();

-- ---------- Đóng kỳ: kỳ mới bắt đầu ngay hôm nay ----------
create or replace function public.close_period(p_period uuid, p_snapshot jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_old public.periods;
  v_new uuid;
begin
  perform public.assert_role(array['admin','accountant']::public.app_role[]);
  select * into v_old from public.periods where id = p_period and closed_at is null for update;
  if v_old.id is null then raise exception 'Kỳ không tồn tại hoặc đã đóng'; end if;
  if exists (select 1 from public.sessions where period_id = p_period and status = 'live') then
    raise exception 'Còn buổi chơi đang diễn ra — kết thúc trước khi đóng kỳ';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' or not (p_snapshot ? 'rows') then
    raise exception 'Dữ liệu chốt kỳ không hợp lệ';
  end if;

  update public.periods
     set closed_at = now(), closed_by = auth.uid(), snapshot = p_snapshot,
         end_date = greatest(public.vn_today(), start_date)
   where id = p_period;

  insert into public.periods (plan, fixed_rate, start_date)
  values (v_old.plan, (select fixed_rate from public.club_settings limit 1), public.vn_today())
  returning id into v_new;

  update public.sessions set period_id = v_new where period_id = p_period and status = 'scheduled';
  return v_new;
end $$;

-- ---------- Nhập bù buổi đã qua: không còn giới hạn theo tháng ----------
-- Buổi nhập bù luôn thuộc kỳ đang mở (kỳ là đợt chia tiền, không phụ thuộc ngày chơi).
create or replace function public.create_past_session(
  p_venue uuid, p_date date, p_start time, p_end time, p_cost integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_period uuid;
  v_id uuid;
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  select id into v_period from public.periods where closed_at is null limit 1;
  if v_period is null then raise exception 'Không có kỳ đang mở'; end if;
  if p_date > public.vn_today() then
    raise exception 'Ngày này chưa tới — hãy thêm lịch bình thường';
  end if;
  if p_end <= p_start then raise exception 'Giờ kết thúc phải sau giờ bắt đầu'; end if;
  if p_cost < 0 then raise exception 'Chi phí không hợp lệ'; end if;
  if not exists (select 1 from public.venues where id = p_venue) then raise exception 'Sân không hợp lệ'; end if;

  insert into public.sessions (period_id, venue_id, play_date, start_time, end_time, cost, status, started_at, ended_at, created_by)
  values (
    v_period, p_venue, p_date, p_start, p_end, p_cost, 'closed',
    (p_date + p_start) at time zone 'Asia/Ho_Chi_Minh',
    (p_date + p_end) at time zone 'Asia/Ho_Chi_Minh',
    auth.uid()
  )
  returning id into v_id;

  -- Kỳ bắt đầu từ buổi sớm nhất của nó
  update public.periods set start_date = p_date where id = v_period and start_date > p_date;
  perform public.renumber_sessions(v_period);
  return v_id;
end $$;

-- ---------- Ảnh chụp dữ liệu: trả số kỳ + ngày thay cho tháng/năm ----------
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
      select jsonb_agg(to_jsonb(p) order by p.seq desc)
      from (select id, seq, start_date, end_date, plan, fixed_rate, closed_at, snapshot is not null as has_snapshot from public.periods) p
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
