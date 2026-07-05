-- Our Space — Bước 6: Ẩn thư riêng từng phía
-- "Xóa bên nào chỉ ẩn bên đó" — người gửi ẩn ở tab Đã gửi, người nhận ẩn ở
-- Hộp thư đến, hai phía độc lập nhau. Khi cả hai đều ẩn thì app tự xóa hẳn row.
--
-- Chạy file này trong Supabase → SQL Editor. Chạy lại nhiều lần cũng không sao.

alter table public.letters
  add column if not exists hidden_by_from boolean not null default false;

alter table public.letters
  add column if not exists hidden_by_to boolean not null default false;
