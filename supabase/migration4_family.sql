-- Our Space — Bước 4: Tài khoản gia đình (thuong, thuan, nhinhi, thinh)
-- Chạy file này trong Supabase → SQL Editor (giống các lần trước).
-- Mở rộng các ràng buộc để thành viên gia đình cũng chia sẻ được
-- vị trí, viết nhật ký và up ảnh. Chạy lại nhiều lần không sao.

-- Vị trí trực tiếp
alter table public.locations drop constraint if exists locations_role_check;
alter table public.locations add constraint locations_role_check
  check (role in ('anh', 'em', 'thuong', 'thuan', 'nhinhi', 'thinh'));

-- Nhật ký
alter table public.diary drop constraint if exists diary_author_check;
alter table public.diary add constraint diary_author_check
  check (author in ('anh', 'em', 'thuong', 'thuan', 'nhinhi', 'thinh'));

-- Album ảnh
alter table public.gallery drop constraint if exists gallery_uploaded_by_check;
alter table public.gallery add constraint gallery_uploaded_by_check
  check (uploaded_by in ('anh', 'em', 'thuong', 'thuan', 'nhinhi', 'thinh'));

-- Thư (vẫn chỉ giữa Anh & Em, nhưng nới sẵn để không vướng về sau)
alter table public.letters drop constraint if exists letters_from_role_check;
alter table public.letters add constraint letters_from_role_check
  check (from_role in ('anh', 'em', 'thuong', 'thuan', 'nhinhi', 'thinh'));
alter table public.letters drop constraint if exists letters_to_role_check;
alter table public.letters add constraint letters_to_role_check
  check (to_role in ('anh', 'em', 'thuong', 'thuan', 'nhinhi', 'thinh'));

-- Open When
alter table public.open_when drop constraint if exists open_when_from_role_check;
alter table public.open_when add constraint open_when_from_role_check
  check (from_role in ('anh', 'em', 'thuong', 'thuan', 'nhinhi', 'thinh'));
