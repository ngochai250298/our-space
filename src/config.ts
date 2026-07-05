import type { SupabaseConfig } from "@/types";

/**
 * ⚙️ CẤU HÌNH ĐỒNG BỘ VỊ TRÍ (Supabase)
 *
 * Cách điền:
 *   1. Tạo project miễn phí tại https://supabase.com
 *   2. Vào SQL Editor, chạy nội dung file supabase/migration.sql
 *   3. Vào Settings → API của Supabase, copy 2 giá trị và dán vào giữa
 *      hai dấu ngoặc kép bên dưới.
 *
 * Để trống ("") nếu chưa dùng — app vẫn chạy bình thường, chỉ là
 * vị trí của người kia sẽ hiển thị "gần đúng" thay vì vị trí thật.
 */
export const SYNC_CONFIG: SupabaseConfig = {
  url: "https://hzbhmosjpmcciwaywego.supabase.co",
  anonKey: "sb_publishable_lDK5AaUEcugkhuM86Nz6aw_0DDyqgGR",
};

/**
 * 🎵 FOLDER NHẠC TRÊN GOOGLE DRIVE
 *
 * Playlist tự đọc các file nhạc (.mp3, .m4a...) trong folder này.
 * Folder phải để chế độ chia sẻ "Bất kỳ ai có đường liên kết".
 * Up bài mới vào folder → mở lại web là tự có trong playlist.
 *
 * Lấy ID từ link folder:
 * https://drive.google.com/drive/folders/<ID-nằm-ở-đây>
 */
export const MUSIC_FOLDER_ID = "1I2NUYly0e_cV6OBBKHb-WD9sMMiiL7BJ";
