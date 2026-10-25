/**
 * 🎵 FOLDER NHẠC TRÊN GOOGLE DRIVE
 *
 * Playlist tự đọc các file nhạc (.mp3, .m4a...) trong folder này.
 * Folder phải để chế độ chia sẻ "Bất kỳ ai có đường liên kết".
 *
 * Lấy ID từ link folder:
 * https://drive.google.com/drive/folders/<ID-nằm-ở-đây>
 */
export const MUSIC_FOLDER_ID = "1I2NUYly0e_cV6OBBKHb-WD9sMMiiL7BJ";

/**
 * 🔐 TRANG QUẢN TRỊ /admin
 *
 * Đăng nhập vào tabi.haimedya.uk/admin bằng tài khoản dưới đây.
 * Mật khẩu thật nằm trong bảng app_config trên server (đổi được ngay trong
 * trang /admin); dòng dưới đây chỉ là hạt giống + phương án dự phòng khi
 * không gọi được /api/admin-config.
 *
 * ⚠️ Đây là lớp bảo vệ phía trình duyệt — tiện cho nhà mình dùng, nhưng
 * KHÔNG phải bảo mật tuyệt đối. Nếu cần chắc chắn, thêm Cloudflare Access
 * cho path /admin.
 */
export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "admin2103";
