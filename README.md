# Our Space ❤️

Không gian riêng tư cho hai người yêu xa (Việt Nam ↔ Nhật Bản).
Xây dựng theo `Our_Space.md` (PRD) — Next.js 15 · TypeScript · Tailwind CSS · Framer Motion · Leaflet.

## Chạy thử trên máy

```bash
npm install
npm run dev
```

Mở http://localhost:3000 — trên điện thoại cùng mạng Wi-Fi, mở `http://<IP-máy-tính>:3000`.

Tài khoản (theo PRD):

| Username | Password |
|----------|----------|
| anh      | 2103     |
| em       | 2502     |

## Deploy lên Cloudflare Pages

Project build ra site tĩnh (`output: "export"`), deploy rất đơn giản:

1. Push code lên GitHub.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Cấu hình build:
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
4. Deploy. Gắn domain riêng nếu muốn.

> ⚠️ **Lưu ý về vị trí:** Geolocation API chỉ hoạt động trên HTTPS (Cloudflare Pages có sẵn) hoặc localhost.

## Bật đồng bộ vị trí thật (Supabase)

Mặc định mọi dữ liệu (nhật ký, thư, ảnh...) lưu trên thiết bị (localStorage) — dùng được ngay không cần backend. Vị trí của **chính bạn** luôn là GPS thật; vị trí của **người kia** chỉ thật khi bật đồng bộ, nếu chưa bật thì bản đồ ghi rõ "gần đúng" (không giả vờ là thật).

Cách bật (một lần, ~5 phút):

1. Tạo project miễn phí tại https://supabase.com
2. Vào **SQL Editor**, chạy nội dung file `supabase/migration.sql`
3. Mở file **`src/config.ts`** (bằng Notepad cũng được), dán 2 giá trị vào giữa dấu ngoặc kép:
   - `url`: **Project URL** (dạng `https://xxxx.supabase.co`)
   - `anonKey`: **Anon key** (Settings → API trong Supabase)
4. Lưu file. Nếu đang chạy `npm run dev` thì trang tự nạp lại; nếu deploy thì build lại.

Điền một lần trong file — cả hai người tự động dùng chung, không cần thao tác gì trên điện thoại.

Cách khác (không cần sửa file): vào app → **Settings → Đồng bộ vị trí** và dán trên từng thiết bị, hoặc đặt env `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` lúc build. Thứ tự ưu tiên: `src/config.ts` → env → Settings trong app.

Khi web đang mở (bất kỳ trang nào), vị trí được đẩy lên mỗi 10 giây; đóng trình duyệt là ngừng — đúng theo PRD, không theo dõi nền.

## Album ảnh trên cloud (Supabase Storage)

Ảnh trong **Album kỷ niệm** được lưu trên Supabase Storage — một người up,
cả hai cùng thấy ngay (realtime). Để bật, chạy thêm file
`supabase/migration2_gallery.sql` trong **SQL Editor** (một lần duy nhất).

- Ảnh được nén về tối đa 1280px trước khi up (~100–300KB/tấm → 1GB miễn phí chứa được vài nghìn tấm)
- Ảnh cũ từng lưu trên thiết bị sẽ **tự động chuyển lên cloud** lần đầu mở album sau khi chạy SQL
- Chưa chạy SQL thì album vẫn dùng được, ảnh tạm lưu trên thiết bị kèm cảnh báo

## Playlist từ Google Drive

Playlist đọc nhạc từ folder Google Drive chung (ID đặt trong `src/config.ts`,
mục `MUSIC_FOLDER_ID`). Folder phải ở chế độ chia sẻ **"Bất kỳ ai có đường
liên kết"**. Up bài mới vào folder → mở lại web là tự có.

Google chặn phát nhạc Drive trực tiếp từ web khác, nên nhạc đi qua proxy
`/gdrive/*` của chính app: khi dev là route handler (`src/app/gdrive/`),
khi deploy là Cloudflare Pages Functions (`functions/gdrive/`) — tự hoạt
động, không cần cấu hình thêm.

## Cấu trúc

```
src/
  app/            # Routes (App Router): login, home, map, diary, letters...
  components/     # UI dùng chung: BottomNav, Modal, Avatar, Field...
  features/       # Logic theo tính năng: auth, map, letters, diary, gallery
  hooks/          # useCollection, useSettings, useSession, useNow
  lib/            # auth, storage, dates, geo, supabase, constants
  types/          # TypeScript types
supabase/
  migration.sql   # Schema cho realtime location
```

## Ghi chú bảo mật

Đây là app riêng tư cho 2 người; mật khẩu kiểm tra ở phía client theo đúng PRD.
Điều đó nghĩa là ai đọc source code có thể thấy mật khẩu — đủ dùng cho mục đích
"cánh cửa riêng tư", nhưng **đừng lưu thông tin nhạy cảm**. Muốn bảo mật thật sự,
chuyển sang Supabase Auth (đã chừa sẵn chỗ trong `src/lib/supabase.ts`).
