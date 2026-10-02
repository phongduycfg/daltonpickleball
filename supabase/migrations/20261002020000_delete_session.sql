-- =====================================================================
-- Xoá hẳn 1 buổi chơi (kể cả buổi đã kết thúc) trong kỳ đang mở.
-- - Quyền: Quản trị viên / Ghi kèo.
-- - Không xoá buổi đang diễn ra (phải kết thúc trước) và buổi của kỳ đã đóng.
-- - Kết quả trận thua của buổi bị xoá theo (ON DELETE CASCADE) → tiền kỳ tự tính lại.
-- - Đánh số lại "Buổi #" của các buổi còn lại theo thứ tự đã chơi.
-- =====================================================================
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

  -- Đánh số lại các buổi đã chơi: 1, 2, 3… theo thời điểm bắt đầu
  update public.sessions s set seq = r.n
    from (
      select id, row_number() over (order by started_at nulls last, play_date, start_time) as n
      from public.sessions where period_id = v_period and status <> 'scheduled'
    ) r
   where s.id = r.id and s.seq is distinct from r.n;
end $$;

revoke execute on function public.delete_session(uuid) from public, anon;
grant execute on function public.delete_session(uuid) to authenticated;
