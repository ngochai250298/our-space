-- Our Space — Bước 2: Album kỷ niệm + Nhật ký trên cloud
-- Chạy file này trong Supabase → SQL Editor (giống lần trước).
-- Chạy lại nhiều lần cũng không sao (mọi lệnh đều an toàn khi lặp).
--
-- Sau khi chạy:
--   • Ảnh up từ bất kỳ thiết bị nào lưu trên server, cả hai cùng thấy
--   • Nhật ký của Anh và Em lưu trên server — tắt máy không mất gì

-- ===== 1. Album kỷ niệm =====

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  album text not null default 'Kỷ niệm',
  storage_path text not null,
  caption text,
  uploaded_by text not null check (uploaded_by in ('anh', 'em')),
  created_at timestamptz not null default now()
);

alter table public.gallery enable row level security;

-- App riêng tư cho 2 người nên cho phép anon đọc/ghi (giống bảng locations)
do $$ begin
  create policy "gallery read" on public.gallery for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "gallery insert" on public.gallery for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "gallery delete" on public.gallery for delete using (true);
exception when duplicate_object then null; end $$;

-- Realtime: người này up, máy người kia tự cập nhật
do $$ begin
  alter publication supabase_realtime add table public.gallery;
exception when duplicate_object then null; end $$;

-- Kho chứa file ảnh (public để hiển thị trực tiếp bằng URL)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

do $$ begin
  create policy "photos bucket read" on storage.objects
    for select using (bucket_id = 'photos');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "photos bucket insert" on storage.objects
    for insert with check (bucket_id = 'photos');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "photos bucket delete" on storage.objects
    for delete using (bucket_id = 'photos');
exception when duplicate_object then null; end $$;

-- ===== 2. Nhật ký =====

create table if not exists public.diary (
  id uuid primary key default gen_random_uuid(),
  author text not null check (author in ('anh', 'em')),
  date date not null,
  content text not null,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diary enable row level security;

do $$ begin
  create policy "diary read" on public.diary for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "diary insert" on public.diary for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "diary update" on public.diary for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "diary delete" on public.diary for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.diary;
exception when duplicate_object then null; end $$;
