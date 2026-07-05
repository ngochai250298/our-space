-- Our Space — Bước 8: Ảnh đại diện (avatar) cho từng tài khoản
-- Đổi avatar ở trang cá nhân hoặc /admin → đồng bộ mọi nơi (thư, bản đồ...).
-- Ảnh lưu trong bucket "photos" (đã có), URL lưu ở cột dưới đây.
--
-- Chạy file này trong Supabase → SQL Editor. Chạy lại nhiều lần cũng không sao.

alter table public.accounts
  add column if not exists avatar_url text;
