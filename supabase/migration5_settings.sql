-- Our Space — Bước 5: Ngày kỷ niệm & ngày gặp nhau dùng chung trên cloud
-- Chạy file này trong Supabase → SQL Editor (giống các lần trước).
-- Chạy lại nhiều lần cũng không sao.
--
-- Chỉ Hải hoặc Bình chỉnh ngày (trong Settings). Giá trị được lưu ở đây nên
-- MỌI tài khoản (kể cả gia đình) đều thấy cùng một ngày đếm ngược, thay vì
-- mỗi máy lưu một kiểu như trước.

-- Bảng chỉ có đúng MỘT dòng (id = 1) — trạng thái dùng chung của cả nhà.
create table if not exists public.couple_settings (
  id integer primary key default 1 check (id = 1),
  anniversary date not null,
  next_meeting date not null,
  next_meeting_label text not null default 'Gặp nhau',
  updated_at timestamptz not null default now()
);

-- Dòng mặc định (nếu chưa có) — trùng với DEFAULT_SETTINGS trong app.
insert into public.couple_settings (id, anniversary, next_meeting, next_meeting_label)
values (1, '2023-02-18', '2026-09-28', 'Gặp nhau')
on conflict (id) do nothing;

alter table public.couple_settings enable row level security;

do $$ begin
  create policy "couple_settings read" on public.couple_settings for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "couple_settings insert" on public.couple_settings for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "couple_settings update" on public.couple_settings for update using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.couple_settings;
exception when duplicate_object then null; end $$;
