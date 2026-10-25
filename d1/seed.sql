-- Dữ liệu khởi tạo cho một database trống. Chạy sau d1/schema.sql.
-- Trùng khoá thì bỏ qua, nên chạy lại nhiều lần cũng không sao.

INSERT OR IGNORE INTO accounts (role, username, display_name, password, kind, gender) VALUES
  ('anh',    'hai',     'Hải',    '2103', 'couple', 'male'),
  ('em',     'binh',    'Bình',   '2502', 'couple', 'female'),
  ('thuong', 'thuong',  'Thương', '0000', 'family', 'female'),
  ('thuan',  'thuan',   'Thuận',  '0000', 'family', 'male'),
  ('nhinhi', 'nhinhi',  'Nhinhi', '0000', 'family', 'female'),
  ('thinh',  'thinh',   'Thịnh',  '0000', 'family', 'male'),
  ('thien',  'thien',   'Thiên',  '1111', 'friend', 'male'),
  ('yen',    'yen',     'Yến',    '1111', 'friend', 'female');

INSERT OR IGNORE INTO app_config (id, admin_password) VALUES (1, 'admin2103');

INSERT OR IGNORE INTO couple_settings (id, anniversary, next_meeting, next_meeting_label)
VALUES (1, '2023-02-18', '2026-09-28', 'Gặp nhau');
