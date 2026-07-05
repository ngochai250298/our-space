-- Our Space — Bước 7: Tài khoản & mật khẩu dùng chung trên cloud
-- Cho phép trang /admin đổi tên hiển thị + mật khẩu, áp dụng cho MỌI thiết bị
-- (thay vì mật khẩu chỉ đổi trên từng máy như trước).
--
-- Chạy file này trong Supabase → SQL Editor. Chạy lại nhiều lần cũng không sao.
--
-- Lưu ý bảo mật: đây là app riêng của gia đình, mật khẩu là mã PIN ngắn nên
-- lưu dạng chữ thường (plaintext). Đừng dùng lại mật khẩu quan trọng ở đây.

create table if not exists public.accounts (
  role text primary key,
  display_name text not null,
  password text not null,
  updated_at timestamptz not null default now()
);

-- Seed đúng 6 tài khoản hiện có (khớp với code). Đã có thì bỏ qua.
insert into public.accounts (role, display_name, password) values
  ('anh',    'Hải',    '2103'),
  ('em',     'Bình',   '2502'),
  ('thuong', 'Thương', '0000'),
  ('thuan',  'Thuận',  '0000'),
  ('nhinhi', 'Nhinhi', '0000'),
  ('thinh',  'Thịnh',  '0000')
on conflict (role) do nothing;

alter table public.accounts enable row level security;

do $$ begin
  create policy "accounts read" on public.accounts for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "accounts insert" on public.accounts for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "accounts update" on public.accounts for update using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.accounts;
exception when duplicate_object then null; end $$;
