-- Our Space — Bước 3: Thư gửi nhau + Open When + Bucket List trên cloud
-- Chạy file này trong Supabase → SQL Editor (giống 2 lần trước).
-- Chạy lại nhiều lần cũng không sao.

-- ===== 1. Thư gửi nhau =====

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  from_role text not null check (from_role in ('anh', 'em')),
  to_role text not null check (to_role in ('anh', 'em')),
  title text not null,
  body text not null,
  unlock_date date not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.letters enable row level security;

do $$ begin
  create policy "letters read" on public.letters for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "letters insert" on public.letters for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "letters update" on public.letters for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "letters delete" on public.letters for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.letters;
exception when duplicate_object then null; end $$;

-- ===== 2. Open When =====

create table if not exists public.open_when (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  emoji text not null default '💌',
  body text not null,
  from_role text not null check (from_role in ('anh', 'em')),
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.open_when enable row level security;

do $$ begin
  create policy "open_when read" on public.open_when for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "open_when insert" on public.open_when for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "open_when update" on public.open_when for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "open_when delete" on public.open_when for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.open_when;
exception when duplicate_object then null; end $$;

-- ===== 3. Bucket List =====

create table if not exists public.bucket_list (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.bucket_list enable row level security;

do $$ begin
  create policy "bucket_list read" on public.bucket_list for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "bucket_list insert" on public.bucket_list for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "bucket_list update" on public.bucket_list for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "bucket_list delete" on public.bucket_list for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.bucket_list;
exception when duplicate_object then null; end $$;
