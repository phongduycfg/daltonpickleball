-- =====================================================================
-- Nhập bù buổi chơi đã qua (quên nhập / khôi phục dữ liệu).
-- Buổi được tạo thẳng ở trạng thái "Đã kết thúc" để điểm danh và ghi trận thua ngay
-- (adjust_loss / set_attendance cho phép sửa buổi đã kết thúc trong kỳ đang mở).
-- =====================================================================

-- Đánh số "Buổi #" 1, 2, 3… cho các buổi đã chơi trong kỳ, theo thời điểm bắt đầu
create or replace function public.renumber_sessions(p_period uuid)
returns void
language sql security definer set search_path = public as $$
  update public.sessions s set seq = r.n
    from (
      select id, row_number() over (order by started_at nulls last, play_date, start_time) as n
      from public.sessions where period_id = p_period and status <> 'scheduled'
    ) r
   where s.id = r.id and s.seq is distinct from r.n;
$$;
revoke execute on function public.renumber_sessions(uuid) from public, anon, authenticated;

create or replace function public.create_past_session(
  p_venue uuid, p_date date, p_start time, p_end time, p_cost integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_period public.periods%rowtype;
  v_id uuid;
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  select * into v_period from public.periods where closed_at is null limit 1;
  if v_period.id is null then raise exception 'Không có kỳ đang mở'; end if;

  if p_date > public.vn_today() then
    raise exception 'Ngày này chưa tới — hãy thêm lịch bình thường';
  end if;
  if p_date < make_date(v_period.year, v_period.month, 1) then
    raise exception 'Ngày % thuộc kỳ đã đóng — chỉ nhập bù được từ ngày 01/%/%',
      to_char(p_date, 'DD/MM/YYYY'), lpad(v_period.month::text, 2, '0'), v_period.year;
  end if;
  if p_end <= p_start then raise exception 'Giờ kết thúc phải sau giờ bắt đầu'; end if;
  if p_cost < 0 then raise exception 'Chi phí không hợp lệ'; end if;
  if not exists (select 1 from public.venues where id = p_venue) then raise exception 'Sân không hợp lệ'; end if;

  insert into public.sessions (period_id, venue_id, play_date, start_time, end_time, cost, status, started_at, ended_at, created_by)
  values (
    v_period.id, p_venue, p_date, p_start, p_end, p_cost, 'closed',
    (p_date + p_start) at time zone 'Asia/Ho_Chi_Minh',
    (p_date + p_end) at time zone 'Asia/Ho_Chi_Minh',
    auth.uid()
  )
  returning id into v_id;

  perform public.renumber_sessions(v_period.id);
  return v_id;
end $$;
revoke execute on function public.create_past_session(uuid, date, time, time, integer) from public, anon;
grant execute on function public.create_past_session(uuid, date, time, time, integer) to authenticated;

-- Xoá buổi: dùng chung hàm đánh số lại
create or replace function public.delete_session(p_session uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_period uuid;
  v_status public.session_status;
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  select s.period_id, s.status into v_period, v_status
    from public.sessions s join public.periods p on p.id = s.period_id
   where s.id = p_session and p.closed_at is null
   for update of s;
  if v_period is null then raise exception 'Không tìm thấy buổi chơi trong kỳ đang mở'; end if;
  if v_status = 'live' then raise exception 'Buổi đang diễn ra — bấm Kết thúc buổi trước khi xoá'; end if;

  delete from public.sessions where id = p_session;
  perform public.renumber_sessions(v_period);
end $$;

-- Bắt đầu buổi: đánh số lại cả kỳ (buổi nhập bù có thể nằm trước buổi hôm nay)
create or replace function public.start_session(p_session uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_period uuid;
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  if exists (select 1 from public.sessions where status = 'live') then
    raise exception 'Đang có buổi chơi diễn ra — kết thúc buổi đó trước';
  end if;
  select s.period_id into v_period
    from public.sessions s join public.periods p on p.id = s.period_id
   where s.id = p_session and s.status = 'scheduled' and p.closed_at is null
   for update of s;
  if v_period is null then raise exception 'Buổi chơi không ở trạng thái sắp diễn ra'; end if;

  update public.sessions
     set status = 'live', started_at = now(), play_date = public.vn_today()
   where id = p_session;
  perform public.renumber_sessions(v_period);
end $$;
