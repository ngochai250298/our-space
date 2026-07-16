-- Our Space — Bước 9: Nhóm bạn bè, tài khoản tự tạo, nối dây & ngắt session
-- Chạy file này trong Supabase → SQL Editor (giống các lần trước).
-- Chạy lại nhiều lần cũng không sao.
--
-- Gồm 4 việc:
--   1. Bỏ ràng buộc liệt kê cứng 6 role → admin tự tạo tài khoản mới được.
--   2. Thêm cột username / kind / gender / revoked_at cho bảng accounts.
--   3. Tạo bảng friend_links (nối dây) + app_config (mật khẩu trang admin).
--   4. Thêm 2 tài khoản bạn bè: thien & yen.

-- ── 1. Bỏ các check constraint liệt kê role ────────────────────────────────
-- Trước đây mỗi lần thêm người là phải sửa constraint. Giờ tài khoản nằm hẳn
-- trong bảng accounts nên các bảng khác chỉ cần role không rỗng.
alter table public.locations drop constraint if exists locations_role_check;
alter table public.diary     drop constraint if exists diary_author_check;
alter table public.gallery   drop constraint if exists gallery_uploaded_by_check;
alter table public.letters   drop constraint if exists letters_from_role_check;
alter table public.letters   drop constraint if exists letters_to_role_check;
alter table public.open_when drop constraint if exists open_when_from_role_check;

-- ── 2. Mở rộng bảng accounts ───────────────────────────────────────────────
alter table public.accounts add column if not exists username   text;
alter table public.accounts add column if not exists kind       text not null default 'family';
alter table public.accounts add column if not exists gender     text not null default 'female';
-- Mốc ngắt session: máy nào đăng nhập TRƯỚC mốc này sẽ tự đăng xuất.
alter table public.accounts add column if not exists revoked_at timestamptz;

-- Điền username cho 6 tài khoản cũ (khớp với code trước đây).
update public.accounts set username = 'hai'     where role = 'anh'    and username is null;
update public.accounts set username = 'binh'    where role = 'em'     and username is null;
update public.accounts set username = 'thuong'  where role = 'thuong' and username is null;
update public.accounts set username = 'thuan'   where role = 'thuan'  and username is null;
update public.accounts set username = 'nhinhi'  where role = 'nhinhi' and username is null;
update public.accounts set username = 'thinh'   where role = 'thinh'  and username is null;

-- Điền kind/gender đúng cho 6 tài khoản cũ (default ở trên là family/female).
update public.accounts set kind = 'couple' where role in ('anh', 'em');
update public.accounts set gender = 'male'   where role in ('anh', 'thuan', 'thinh');
update public.accounts set gender = 'female' where role in ('em', 'thuong', 'nhinhi');

-- Username là tên đăng nhập → không được trùng.
do $$ begin
  alter table public.accounts add constraint accounts_username_key unique (username);
exception when duplicate_table or duplicate_object then null; end $$;

do $$ begin
  alter table public.accounts add constraint accounts_kind_check
    check (kind in ('couple', 'family', 'friend'));
exception when duplicate_object then null; end $$;

-- ── 3. Hai tài khoản bạn bè mới ────────────────────────────────────────────
insert into public.accounts (role, username, display_name, password, kind, gender) values
  ('thien', 'thien', 'Thiên', '1111', 'friend', 'male'),
  ('yen',   'yen',   'Yến',   '1111', 'friend', 'female')
on conflict (role) do nothing;

-- ── 4. Nối dây bạn bè ──────────────────────────────────────────────────────
-- Mỗi dòng = một cặp được admin nối. role_a luôn < role_b (sắp xếp theo bảng
-- chữ cái) để một cặp không bị lưu hai lần theo hai thứ tự.
create table if not exists public.friend_links (
  id uuid primary key default gen_random_uuid(),
  role_a text not null,
  role_b text not null,
  anniversary date,
  created_at timestamptz not null default now(),
  constraint friend_links_order_check unique (role_a, role_b),
  constraint friend_links_distinct_check check (role_a < role_b)
);

alter table public.friend_links enable row level security;
do $$ begin
  create policy "friend_links read" on public.friend_links for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "friend_links insert" on public.friend_links for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "friend_links update" on public.friend_links for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "friend_links delete" on public.friend_links for delete using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.friend_links;
exception when duplicate_object then null; end $$;

-- ── 5. Mật khẩu trang /admin (đổi được từ trong web) ───────────────────────
-- Trước đây nằm cứng trong src/config.ts, đổi là phải deploy lại.
-- ⚠️ Vẫn KHÔNG phải bảo mật thật: ai đọc được anon key đều đọc được bảng này.
-- Nếu cần chắc chắn thì thêm Cloudflare Access cho path /admin.
create table if not exists public.app_config (
  id integer primary key default 1 check (id = 1),
  admin_password text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (id, admin_password)
values (1, 'admin2103')
on conflict (id) do nothing;

alter table public.app_config enable row level security;
do $$ begin
  create policy "app_config read" on public.app_config for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "app_config insert" on public.app_config for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "app_config update" on public.app_config for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.app_config;
exception when duplicate_object then null; end $$;

-- ── 6. Ngày kỷ niệm cho cặp bạn bè ─────────────────────────────────────────
-- Nhóm bạn bè không cần "ngày gặp nhau", chỉ cần ngày bắt đầu yêu nhau —
-- nên ngày đó nằm ngay trong friend_links.anniversary ở trên.
