-- =====================================================================
-- DALTON PICKLEBALL — Schema khởi tạo
-- Nguyên tắc bảo mật:
--   * Mọi bảng bật RLS; chỉ thành viên đã được duyệt (status = 'active') mới đọc được dữ liệu CLB.
--   * Các thao tác nhạy cảm (ghi trận thua, đổi vai trò, thanh toán, đóng kỳ) đi qua hàm RPC
--     SECURITY DEFINER có kiểm tra vai trò bên trong — client không ghi trực tiếp vào bảng.
--   * Hàm SECURITY DEFINER luôn cố định search_path để tránh tấn công chiếm schema.
-- =====================================================================

set check_function_bodies = off;

-- ---------------------------------------------------------------------
-- 1. Kiểu dữ liệu
-- ---------------------------------------------------------------------
create type public.app_role       as enum ('admin', 'accountant', 'scorer', 'member');
create type public.member_status  as enum ('pending', 'active', 'rejected');
create type public.session_status as enum ('scheduled', 'live', 'closed');
create type public.ledger_kind    as enum ('expense', 'income');
create type public.pay_status     as enum ('none', 'pending', 'done');

-- ---------------------------------------------------------------------
-- 2. Bảng
-- ---------------------------------------------------------------------

-- Hồ sơ thành viên, 1-1 với auth.users
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  avatar_url    text,
  role          public.app_role not null default 'member',
  status        public.member_status not null default 'pending',
  skill         smallint not null default 0 check (skill between -3 and 3),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- CLB chỉ có đúng 1 Kế toán
create unique index profiles_single_accountant on public.profiles (role) where role = 'accountant';
create index profiles_status_idx on public.profiles (status);

-- Cấu hình CLB (bảng 1 dòng)
create table public.club_settings (
  id               boolean primary key default true check (id),
  club_name        text not null default 'CLB Dalton Pickleball',
  fixed_rate       integer not null default 30000 check (fixed_rate > 0),
  min_sessions     smallint not null default 5 check (min_sessions between 1 and 31),
  bank_bin         text check (bank_bin ~ '^[0-9]{6}$'),
  bank_account_no  text check (bank_account_no ~ '^[0-9]{6,19}$'),
  bank_owner       text check (char_length(bank_owner) <= 60),
  transfer_syntax  text not null default 'DALTON [TEN] [KY]' check (char_length(transfer_syntax) <= 40),
  updated_at       timestamptz not null default now()
);

-- Sân chơi
create table public.venues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 80),
  area          text not null default '' check (char_length(area) <= 80),
  default_cost  integer not null check (default_cost >= 0),
  is_active     boolean not null default true,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);

-- Kỳ thanh toán (theo tháng). Chỉ 1 kỳ đang mở.
create table public.periods (
  id          uuid primary key default gen_random_uuid(),
  year        smallint not null check (year between 2024 and 2100),
  month       smallint not null check (month between 1 and 12),
  plan        smallint not null default 1 check (plan in (1, 2)),   -- 1: chia đều theo trận thua · 2: cố định/trận + chia phần hụt
  fixed_rate  integer not null default 30000 check (fixed_rate > 0),
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz,
  closed_by   uuid references public.profiles (id),
  snapshot    jsonb,                                                -- kết quả chốt khi đóng kỳ (chỉ đọc)
  unique (year, month)
);
create unique index periods_single_open on public.periods ((true)) where closed_at is null;

-- Buổi chơi
create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  period_id   uuid not null references public.periods (id) on delete cascade,
  venue_id    uuid not null references public.venues (id),
  play_date   date not null,
  start_time  time not null,
  end_time    time not null,
  cost        integer not null check (cost >= 0),                  -- chi phí sân + nước (Kế toán chi)
  status      public.session_status not null default 'scheduled',
  seq         smallint,                                             -- số thứ tự buổi trong kỳ, gán khi bắt đầu
  started_at  timestamptz,
  ended_at    timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);
create unique index sessions_single_live on public.sessions ((true)) where status = 'live';
create index sessions_period_idx on public.sessions (period_id, play_date);

-- Kết quả từng người trong buổi: có dòng = có mặt; losses = số trận thua
create table public.session_results (
  session_id  uuid not null references public.sessions (id) on delete cascade,
  member_id   uuid not null references public.profiles (id) on delete cascade,
  losses      smallint not null default 0 check (losses between 0 and 99),
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  primary key (session_id, member_id)
);
-- Realtime cần dữ liệu cũ để biết số trận thua tăng hay giảm
alter table public.session_results replica identity full;

-- Khoản thu / chi khác trong kỳ
create table public.ledger_items (
  id           uuid primary key default gen_random_uuid(),
  period_id    uuid not null references public.periods (id) on delete cascade,
  kind         public.ledger_kind not null,
  description  text not null check (char_length(description) between 1 and 120),
  amount       integer not null check (amount > 0),
  member_id    uuid not null references public.profiles (id),      -- người đã chi (khoản chi) / người đang giữ (khoản thu)
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index ledger_items_period_idx on public.ledger_items (period_id);

-- Thành viên không chia phần hụt (phương án 2)
create table public.period_exclusions (
  period_id  uuid not null references public.periods (id) on delete cascade,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (period_id, member_id)
);

-- Trạng thái thanh toán theo kỳ. Không có dòng = 'none' (chưa đóng)
create table public.payments (
  period_id     uuid not null references public.periods (id) on delete cascade,
  member_id     uuid not null references public.profiles (id) on delete cascade,
  status        public.pay_status not null default 'none',
  reported_at   timestamptz,
  confirmed_at  timestamptz,
  confirmed_by  uuid references public.profiles (id),
  primary key (period_id, member_id)
);

-- Đăng ký Web Push
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------
-- 3. Hàm trợ giúp phân quyền
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = any (roles), false)
$$;

-- Ngày hiện tại theo giờ Việt Nam
create or replace function public.vn_today()
returns date
language sql stable as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;

-- ---------------------------------------------------------------------
-- 4. Trigger
-- ---------------------------------------------------------------------

-- Tạo hồ sơ khi đăng nhập Google lần đầu.
-- Người đầu tiên đăng nhập (khi CLB chưa có Quản trị viên) trở thành Quản trị viên;
-- mọi người sau đó ở trạng thái "chờ duyệt".
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_bootstrap boolean;
begin
  v_bootstrap := not exists (select 1 from public.profiles where role = 'admin');
  insert into public.profiles (id, email, display_name, avatar_url, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Thành viên'), 40),
    new.raw_user_meta_data ->> 'avatar_url',
    case when v_bootstrap then 'admin'::public.app_role else 'member'::public.app_role end,
    case when v_bootstrap then 'active'::public.member_status else 'pending'::public.member_status end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger club_settings_touch before update on public.club_settings
  for each row execute function public.touch_updated_at();

-- Ghi lại ai vừa sửa kết quả (dùng cho banner realtime)
create or replace function public.stamp_session_result()
returns trigger language plpgsql as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;

create trigger session_results_stamp before insert or update on public.session_results
  for each row execute function public.stamp_session_result();

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.club_settings      enable row level security;
alter table public.venues             enable row level security;
alter table public.periods            enable row level security;
alter table public.sessions           enable row level security;
alter table public.session_results    enable row level security;
alter table public.ledger_items       enable row level security;
alter table public.period_exclusions  enable row level security;
alter table public.payments           enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: thành viên xem nhau; ai cũng xem được hồ sơ của chính mình (kể cả khi đang chờ duyệt)
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_member());
-- Tự sửa tên + ảnh của mình; các cột role/status/skill bị khoá bằng quyền cột bên dưới
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_member()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Dữ liệu CLB: chỉ thành viên đã duyệt được đọc
create policy club_settings_select     on public.club_settings     for select to authenticated using (public.is_member());
create policy venues_select            on public.venues            for select to authenticated using (public.is_member());
create policy periods_select           on public.periods           for select to authenticated using (public.is_member());
create policy sessions_select          on public.sessions          for select to authenticated using (public.is_member());
create policy session_results_select   on public.session_results   for select to authenticated using (public.is_member());
create policy ledger_items_select      on public.ledger_items      for select to authenticated using (public.is_member());
create policy period_exclusions_select on public.period_exclusions for select to authenticated using (public.is_member());
create policy payments_select          on public.payments          for select to authenticated using (public.is_member());

-- Sân: Quản trị viên thêm/sửa
create policy venues_write on public.venues for all to authenticated
  using (public.has_role(array['admin']::public.app_role[]))
  with check (public.has_role(array['admin']::public.app_role[]));

-- Kỳ: Quản trị viên / Kế toán đổi phương án chia (đóng kỳ đi qua RPC)
create policy periods_update on public.periods for update to authenticated
  using (closed_at is null and public.has_role(array['admin','accountant']::public.app_role[]))
  with check (closed_at is null);
revoke update on public.periods from authenticated;
grant update (plan) on public.periods to authenticated;

-- Buổi chơi: Quản trị viên / Ghi kèo tạo lịch; ai có quyền ghi kèo hoặc tài chính được sửa chi phí
create policy sessions_insert on public.sessions for insert to authenticated
  with check (
    public.has_role(array['admin','scorer']::public.app_role[])
    and status = 'scheduled'
    and exists (select 1 from public.periods p where p.id = period_id and p.closed_at is null)
  );
create policy sessions_update on public.sessions for update to authenticated
  using (
    public.has_role(array['admin','scorer','accountant']::public.app_role[])
    and exists (select 1 from public.periods p where p.id = period_id and p.closed_at is null)
  );
revoke update on public.sessions from authenticated;
grant update (cost, venue_id, play_date, start_time, end_time) on public.sessions to authenticated;
create policy sessions_delete on public.sessions for delete to authenticated
  using (status = 'scheduled' and public.has_role(array['admin','scorer']::public.app_role[]));

-- Thu/chi khác + loại trừ: Quản trị viên / Kế toán, chỉ khi kỳ đang mở
create policy ledger_items_insert on public.ledger_items for insert to authenticated
  with check (
    public.has_role(array['admin','accountant']::public.app_role[])
    and exists (select 1 from public.periods p where p.id = period_id and p.closed_at is null)
  );
create policy ledger_items_delete on public.ledger_items for delete to authenticated
  using (
    public.has_role(array['admin','accountant']::public.app_role[])
    and exists (select 1 from public.periods p where p.id = period_id and p.closed_at is null)
  );
create policy period_exclusions_write on public.period_exclusions for all to authenticated
  using (
    public.has_role(array['admin','accountant']::public.app_role[])
    and exists (select 1 from public.periods p where p.id = period_id and p.closed_at is null)
  )
  with check (
    public.has_role(array['admin','accountant']::public.app_role[])
    and exists (select 1 from public.periods p where p.id = period_id and p.closed_at is null)
  );

-- Đăng ký push: mỗi người chỉ quản lý của mình
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member());

-- session_results, payments, club_settings: KHÔNG có policy ghi → chỉ ghi qua RPC bên dưới

-- ---------------------------------------------------------------------
-- 6. RPC nghiệp vụ (SECURITY DEFINER, tự kiểm tra quyền)
-- ---------------------------------------------------------------------

-- Lỗi nghiệp vụ dùng mã P0001 kèm thông điệp tiếng Việt để hiển thị trực tiếp
create or replace function public.assert_role(roles public.app_role[])
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(roles) then
    raise exception 'Bạn không có quyền thực hiện thao tác này' using errcode = '42501';
  end if;
end $$;

-- Tăng/giảm số trận thua (nguyên tử, an toàn khi 2 người cùng bấm)
create or replace function public.adjust_loss(p_session uuid, p_member uuid, p_delta integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_status public.session_status;
  v_losses integer;
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  if p_delta not in (-1, 1) then
    raise exception 'Bước tăng giảm không hợp lệ';
  end if;
  select s.status into v_status
    from public.sessions s join public.periods p on p.id = s.period_id
   where s.id = p_session and p.closed_at is null
   for update of s;
  if v_status is null then raise exception 'Không tìm thấy buổi chơi trong kỳ đang mở'; end if;
  if v_status = 'scheduled' then raise exception 'Buổi chơi chưa bắt đầu'; end if;
  if not exists (select 1 from public.profiles where id = p_member and status = 'active') then
    raise exception 'Thành viên không hợp lệ';
  end if;

  -- Giảm khi chưa có mặt: không làm gì (không tự đánh dấu có mặt)
  if p_delta < 0 and not exists (select 1 from public.session_results where session_id = p_session and member_id = p_member) then
    return 0;
  end if;

  -- Bấm (+) với người đang vắng sẽ tự đánh dấu có mặt
  insert into public.session_results (session_id, member_id, losses)
  values (p_session, p_member, greatest(p_delta, 0))
  on conflict (session_id, member_id)
  do update set losses = greatest(public.session_results.losses + p_delta, 0)
  returning losses into v_losses;
  return v_losses;
end $$;

-- Điểm danh: có mặt (0 trận thua) / vắng
create or replace function public.set_attendance(p_session uuid, p_member uuid, p_present boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status public.session_status;
  v_losses smallint;
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  select s.status into v_status
    from public.sessions s join public.periods p on p.id = s.period_id
   where s.id = p_session and p.closed_at is null;
  if v_status is null then raise exception 'Không tìm thấy buổi chơi trong kỳ đang mở'; end if;
  if v_status = 'scheduled' then raise exception 'Buổi chơi chưa bắt đầu'; end if;

  if p_present then
    insert into public.session_results (session_id, member_id, losses)
    select p_session, p_member, 0
     where exists (select 1 from public.profiles where id = p_member and status = 'active')
    on conflict do nothing;
  else
    select losses into v_losses from public.session_results where session_id = p_session and member_id = p_member;
    if coalesce(v_losses, 0) > 0 then
      raise exception 'Thành viên đang có % trận thua — giảm về 0 trước khi đánh vắng', v_losses;
    end if;
    delete from public.session_results where session_id = p_session and member_id = p_member;
  end if;
end $$;

-- Bắt đầu buổi: chỉ 1 buổi LIVE; gán số thứ tự và đổi ngày về hôm nay
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
     set status = 'live',
         started_at = now(),
         play_date = public.vn_today(),
         seq = (select count(*) + 1 from public.sessions where period_id = v_period and status <> 'scheduled')
   where id = p_session;
end $$;

-- Kết thúc buổi: phải có ít nhất 1 người có mặt
create or replace function public.end_session(p_session uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  if not exists (select 1 from public.sessions where id = p_session and status = 'live') then
    raise exception 'Buổi chơi không đang diễn ra';
  end if;
  if not exists (select 1 from public.session_results where session_id = p_session) then
    raise exception 'Chưa có ai có mặt trong buổi này';
  end if;
  update public.sessions set status = 'closed', ended_at = now() where id = p_session;
end $$;

-- Mở lại buổi đã kết thúc (để sửa) khi không có buổi nào đang diễn ra
create or replace function public.reopen_session(p_session uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_role(array['admin','scorer']::public.app_role[]);
  if exists (select 1 from public.sessions where status = 'live') then
    raise exception 'Đang có buổi chơi diễn ra';
  end if;
  update public.sessions s set status = 'live', ended_at = null
    from public.periods p
   where s.id = p_session and s.status = 'closed' and p.id = s.period_id and p.closed_at is null;
  if not found then raise exception 'Không thể mở lại buổi này'; end if;
end $$;

-- Thành viên báo đã chuyển khoản (chưa đóng → chờ xác nhận)
create or replace function public.report_payment(p_period uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Bạn không có quyền thực hiện thao tác này' using errcode = '42501'; end if;
  if not exists (select 1 from public.periods where id = p_period and closed_at is null) then
    raise exception 'Kỳ đã đóng';
  end if;
  insert into public.payments (period_id, member_id, status, reported_at)
  values (p_period, auth.uid(), 'pending', now())
  on conflict (period_id, member_id) do update
     set status = 'pending', reported_at = now()
   where public.payments.status = 'none';
end $$;

-- Kế toán xác nhận / từ chối / đánh dấu đã trả lại
create or replace function public.set_payment_status(p_period uuid, p_member uuid, p_status public.pay_status)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_role(array['admin','accountant']::public.app_role[]);
  if not exists (select 1 from public.periods where id = p_period and closed_at is null) then
    raise exception 'Kỳ đã đóng';
  end if;
  insert into public.payments (period_id, member_id, status, confirmed_at, confirmed_by)
  values (p_period, p_member, p_status,
          case when p_status = 'done' then now() end,
          case when p_status = 'done' then auth.uid() end)
  on conflict (period_id, member_id) do update
     set status = excluded.status, confirmed_at = excluded.confirmed_at, confirmed_by = excluded.confirmed_by;
end $$;

-- Quản trị viên duyệt / đổi vai trò / chỉnh trình độ
create or replace function public.admin_update_member(
  p_member uuid, p_role public.app_role, p_status public.member_status, p_skill integer)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old public.profiles;
begin
  perform public.assert_role(array['admin']::public.app_role[]);
  select * into v_old from public.profiles where id = p_member for update;
  if v_old.id is null then raise exception 'Không tìm thấy thành viên'; end if;
  if p_skill not between -3 and 3 then raise exception 'Trình độ phải trong khoảng −3 đến +3'; end if;

  -- Luôn giữ ít nhất 1 Quản trị viên đang hoạt động
  if v_old.role = 'admin' and v_old.status = 'active' and (p_role <> 'admin' or p_status <> 'active')
     and (select count(*) from public.profiles where role = 'admin' and status = 'active') = 1 then
    raise exception 'CLB cần ít nhất 1 Quản trị viên';
  end if;

  -- Chỉ 1 Kế toán: người cũ chuyển về Thành viên
  if p_role = 'accountant' then
    update public.profiles set role = 'member' where role = 'accountant' and id <> p_member;
  end if;

  update public.profiles set role = p_role, status = p_status, skill = p_skill where id = p_member;
end $$;

-- Cài đặt tài khoản nhận tiền (Kế toán / Quản trị viên)
create or replace function public.update_bank_settings(p_bin text, p_account_no text, p_owner text, p_syntax text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_role(array['admin','accountant']::public.app_role[]);
  update public.club_settings
     set bank_bin = p_bin, bank_account_no = p_account_no, bank_owner = upper(p_owner), transfer_syntax = upper(p_syntax)
   where id;
end $$;

-- Cài đặt chung (Quản trị viên)
create or replace function public.update_general_settings(p_club_name text, p_fixed_rate integer, p_min_sessions integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_role(array['admin']::public.app_role[]);
  update public.club_settings
     set club_name = p_club_name, fixed_rate = p_fixed_rate, min_sessions = p_min_sessions
   where id;
  -- Đơn giá mới áp dụng ngay cho kỳ đang mở
  update public.periods set fixed_rate = p_fixed_rate where closed_at is null;
end $$;

-- Đóng kỳ: lưu snapshot, mở kỳ tháng kế tiếp, chuyển các lịch sắp tới sang kỳ mới
create or replace function public.close_period(p_period uuid, p_snapshot jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_old public.periods;
  v_new uuid;
  v_year smallint;
  v_month smallint;
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

  update public.periods set closed_at = now(), closed_by = auth.uid(), snapshot = p_snapshot where id = p_period;

  v_month := case when v_old.month = 12 then 1 else v_old.month + 1 end;
  v_year  := case when v_old.month = 12 then v_old.year + 1 else v_old.year end;
  insert into public.periods (year, month, plan, fixed_rate)
  values (v_year, v_month, v_old.plan, v_old.fixed_rate)
  returning id into v_new;

  update public.sessions set period_id = v_new where period_id = p_period and status = 'scheduled';
  return v_new;
end $$;

-- Chỉ người dùng đã đăng nhập được gọi RPC
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_role(), public.is_member(), public.has_role(public.app_role[]), public.vn_today(),
  public.adjust_loss(uuid, uuid, integer), public.set_attendance(uuid, uuid, boolean),
  public.start_session(uuid), public.end_session(uuid), public.reopen_session(uuid),
  public.report_payment(uuid), public.set_payment_status(uuid, uuid, public.pay_status),
  public.admin_update_member(uuid, public.app_role, public.member_status, integer),
  public.update_bank_settings(text, text, text, text), public.update_general_settings(text, integer, integer),
  public.close_period(uuid, jsonb)
to authenticated;

-- ---------------------------------------------------------------------
-- 7. Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.sessions, public.session_results, public.payments, public.ledger_items, public.period_exclusions,
  public.periods, public.profiles, public.venues, public.club_settings;

-- ---------------------------------------------------------------------
-- 8. Storage: ảnh đại diện (đọc công khai, mỗi người chỉ ghi vào thư mục của mình)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
