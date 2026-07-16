-- Our Space — Bước 10: Cho phép xoá hẳn một tài khoản
-- Chạy file này trong Supabase → SQL Editor. Chạy lại nhiều lần cũng không sao.
--
-- Nút "Xoá tài khoản" trong /admin xoá sạch dấu vết của một người: nhật ký,
-- ảnh, thư, Open When, vị trí, dây nối và chính tài khoản đó.
--
-- Các bảng diary / gallery / letters / open_when / friend_links đã có policy
-- delete từ trước; còn thiếu đúng hai bảng dưới đây.

-- Xoá dòng tài khoản
do $$ begin
  create policy "accounts delete" on public.accounts for delete using (true);
exception when duplicate_object then null; end $$;

-- Xoá vị trí cuối cùng của người đó
do $$ begin
  create policy "locations delete" on public.locations for delete using (true);
exception when duplicate_object then null; end $$;

-- Lưu ý: app KHÔNG cho xoá 'anh' (Hải) và 'em' (Bình) — hai role này được đặc
-- cách khắp nơi (bản đồ, ngày kỷ niệm chung, quyền admin) nên xoá là gãy app.
-- Chặn ở tầng database luôn cho chắc, phòng khi ai đó gọi thẳng API.
create or replace function public.protect_couple_accounts()
returns trigger as $$
begin
  if old.role in ('anh', 'em') then
    raise exception 'Không thể xoá tài khoản của Hải hoặc Bình';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists protect_couple_accounts_trigger on public.accounts;
create trigger protect_couple_accounts_trigger
  before delete on public.accounts
  for each row execute function public.protect_couple_accounts();
