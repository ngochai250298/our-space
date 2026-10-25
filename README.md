# Our Space ❤️

Không gian riêng tư cho hai người yêu xa (Việt Nam ↔ Nhật Bản).
Xây dựng theo `Our_Space.md` (PRD) — Next.js 15 · TypeScript · Tailwind CSS · Framer Motion · Leaflet.
Chạy trên Cloudflare Workers (OpenNext) với **D1** (dữ liệu) và **R2** (ảnh).

## Chạy thử trên máy

```bash
npm install
npx wrangler d1 execute our-space-db --local --file=d1/schema.sql
npx wrangler d1 execute our-space-db --local --file=d1/seed.sql
npm run dev
```

Hai lệnh `d1 execute` chỉ cần chạy lần đầu: chúng tạo database D1 *local*
(nằm trong `.wrangler/state`) để `npm run dev` có dữ liệu.

Mở http://localhost:3000 — trên điện thoại cùng mạng Wi-Fi, mở `http://<IP-máy-tính>:3000`.

Tài khoản mặc định (xem `d1/seed.sql`):

| Username | Password | Vai       |
|----------|----------|-----------|
| hai      | 2103     | couple    |
| binh     | 2502     | couple    |
| admin    | admin2103 | trang /admin |

## Dữ liệu: D1 + R2 (không còn Supabase)

Trình duyệt **không** nói chuyện trực tiếp với database. Mọi thứ đi qua route
handler của chính app trong `src/app/api/*`, và chỉ Worker đọc/ghi D1 + R2:

| Endpoint | Dùng cho |
|----------|----------|
| `POST /api/auth/login` | đăng nhập (mật khẩu không bao giờ rời server) |
| `/api/accounts`, `/api/accounts/[role]` | danh sách / sửa / xoá tài khoản |
| `/api/admin-config` | mật khẩu trang /admin |
| `/api/settings` | ngày kỷ niệm & ngày gặp nhau (dùng chung cả nhà) |
| `/api/locations`, `/api/locations/[role]` | vị trí trên bản đồ |
| `/api/diary`, `/api/letters`, `/api/open-when`, `/api/bucket-list` (+ `/[id]`) | các collection |
| `/api/gallery`, `/api/gallery/[id]`, `/api/avatar` | ảnh album + ảnh đại diện (file nằm ở R2) |
| `/api/storage/[...path]` | trả file từ R2 (bucket để private) |

D1 không có realtime như Supabase, nên client **poll**: collection 5 giây một
lần (và mỗi khi tab được mở lại), vị trí 5 giây, ngày/friend-links 8 giây.

Binding khai báo trong `wrangler.jsonc`: `DB` (D1 `our-space-db`),
`PHOTOS_BUCKET` (R2 `our-space-photos`), `IMAGES`, `ASSETS`.
Schema đầy đủ: `d1/schema.sql` · dữ liệu khởi tạo: `d1/seed.sql`.
Đổi binding thì chạy `npm run cf-typegen` để cập nhật `cloudflare-env.d.ts`.

Khi mạng lỗi, app vẫn dùng được: dữ liệu lưu tạm trên thiết bị
(localStorage) rồi tự đẩy lên server ở lần mở sau.

## Deploy lên Cloudflare (Workers + OpenNext)

Project deploy qua adapter OpenNext (cấu hình sẵn trong `wrangler.jsonc`):

1. Push code lên GitHub (repo **Private**).
2. Cloudflare Dashboard → **Workers & Pages → Create → Import a repository**.
3. Build settings:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
4. Deploy. Gắn domain riêng nếu muốn.

Hoặc deploy thẳng từ máy: `npm run deploy` (cần đăng nhập `npx wrangler login`).

Database/bucket trên Cloudflare đã tồn tại sẵn (`our-space-db`,
`our-space-photos`). Nếu dựng mới từ đầu:

```bash
npx wrangler d1 create our-space-db        # rồi dán database_id vào wrangler.jsonc
npx wrangler r2 bucket create our-space-photos
npx wrangler d1 execute our-space-db --remote --file=d1/schema.sql
npx wrangler d1 execute our-space-db --remote --file=d1/seed.sql
```

> ⚠️ **Lưu ý về vị trí:** Geolocation API chỉ hoạt động trên HTTPS (Cloudflare có sẵn) hoặc localhost.

Khi web đang mở (bất kỳ trang nào), vị trí được đẩy lên mỗi 10 giây; đóng trình duyệt là ngừng — đúng theo PRD, không theo dõi nền.

## Album ảnh (R2)

Ảnh trong **Album kỷ niệm** nằm trong bucket R2 `our-space-photos`, một người
up là cả hai thấy. Bucket để private — ảnh được trả qua
`/api/storage/<key>` của app, không cần public URL.

- Ảnh được nén về tối đa 1280px trước khi up (~100–300KB/tấm)
- Ảnh cũ từng lưu trên thiết bị sẽ **tự động chuyển lên cloud** lần đầu mở album
- Mất mạng thì album vẫn dùng được, ảnh tạm lưu trên thiết bị kèm cảnh báo

## Playlist từ Google Drive

Playlist đọc nhạc từ folder Google Drive chung (ID đặt trong `src/config.ts`,
mục `MUSIC_FOLDER_ID`). Folder phải ở chế độ chia sẻ **"Bất kỳ ai có đường
liên kết"**. Up bài mới vào folder → mở lại web là tự có.

Google chặn phát nhạc Drive trực tiếp từ web khác, nên nhạc đi qua proxy
`/gdrive/*` của chính app (route handler trong `src/app/gdrive/`) — chạy
cả khi dev lẫn khi deploy, không cần cấu hình thêm.

## Cấu trúc

```
src/
  app/
    api/          # Route handlers: đọc/ghi D1 + R2 (chỉ chạy trên server)
    gdrive/       # Proxy nhạc Google Drive
    (main)/       # Các trang: home, map, diary, letters, gallery...
  components/     # UI dùng chung: BottomNav, Modal, Avatar, Field...
  features/       # Logic theo tính năng: admin, map, letters, diary, gallery
  hooks/          # useCollection, useCloudCollection, useSettings, useSession
  lib/            # api (fetch /api), d1, r2, crudRoute, auth, storage, dates
  types/          # TypeScript types
d1/
  schema.sql      # Schema D1
  seed.sql        # Tài khoản + cấu hình khởi tạo
```

## Ghi chú bảo mật

Đây là app riêng tư cho nhà mình. Mật khẩu tài khoản **đã chuyển về server**
(bảng `accounts` trong D1, kiểm tra ở `POST /api/auth/login`), nên không còn
nằm trong bundle gửi xuống trình duyệt. Hai điểm vẫn chỉ là "cánh cửa riêng
tư", không phải bảo mật thật:

- danh sách tài khoản dự phòng trong `src/lib/auth.ts` (dùng khi mất mạng),
- cổng `/admin` kiểm tra ở phía trình duyệt (mật khẩu lấy từ
  `/api/admin-config`).

Muốn chắc chắn thì thêm **Cloudflare Access** cho path `/admin`, và đừng lưu
thông tin nhạy cảm trong app.
