-- =====================================================================
-- Duyệt trước theo email: người có email trong danh sách này sẽ được
-- kích hoạt ngay khi đăng nhập Google lần đầu (không phải chờ duyệt).
-- Chỉ thao tác qua SQL Editor / service role — client không đọc/ghi được.
-- =====================================================================
create table if not exists public.preapproved_emails (
  email      text primary key check (email = lower(email)),
  role       public.app_role not null default 'member' check (role <> 'admin'),
  skill      integer not null default 0 check (skill between -3 and 3),
  created_at timestamptz not null default now()
);

alter table public.preapproved_emails enable row level security;
-- Không tạo policy nào → người dùng đăng nhập không truy cập được bảng này
revoke all on public.preapproved_emails from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_bootstrap boolean;
  v_pre public.preapproved_emails%rowtype;
begin
  v_bootstrap := not exists (select 1 from public.profiles where role = 'admin');
  select * into v_pre from public.preapproved_emails where email = lower(coalesce(new.email, ''));

  insert into public.profiles (id, email, display_name, avatar_url, role, status, skill)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Thành viên'), 40),
    new.raw_user_meta_data ->> 'avatar_url',
    case when v_bootstrap then 'admin'::public.app_role else coalesce(v_pre.role, 'member'::public.app_role) end,
    case when v_bootstrap or v_pre.email is not null then 'active'::public.member_status else 'pending'::public.member_status end,
    coalesce(v_pre.skill, 0)
  )
  on conflict (id) do nothing;

  -- Đã dùng xong lời mời → xoá khỏi danh sách
  if v_pre.email is not null then
    delete from public.preapproved_emails where email = v_pre.email;
  end if;
  return new;
end $$;
