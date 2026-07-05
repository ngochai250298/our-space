-- Our Space — Supabase schema
-- Run this in the Supabase SQL editor, then set
--   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
-- in Cloudflare Pages env vars to enable realtime location sync.

-- Live location: one row per person, updated in place.
create table if not exists public.locations (
  role text primary key check (role in ('anh', 'em')),
  lat double precision not null,
  lng double precision not null,
  accuracy double precision not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.locations enable row level security;

-- The app is private (only two people know the URL and credentials),
-- so anon read/write on this single table is acceptable here.
create policy "locations read" on public.locations for select using (true);
create policy "locations insert" on public.locations for insert with check (true);
create policy "locations update" on public.locations for update using (true);

-- Realtime
alter publication supabase_realtime add table public.locations;

-- Future tables when moving the rest of the data off localStorage:
--   profiles(role pk, display_name)
--   diary(id pk, author, date, content, created_at, updated_at)
--   letters(id pk, from_role, to_role, title, body, unlock_date, created_at, read_at)
--   gallery(id pk, album, storage_path, caption, uploaded_by, created_at)
--   bucket_list(id pk, title, done, created_at)
--   playlist(id pk, title, artist, url, note, added_by, created_at)
--   settings(id pk, anniversary, next_meeting, theme)
