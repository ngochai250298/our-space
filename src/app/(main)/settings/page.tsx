"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Moon,
  Sun,
  CalendarHeart,
  Info,
  ChevronRight,
  RadioTower,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { AvatarUploader } from "@/components/AvatarUploader";
import { Input, PrimaryButton } from "@/components/Field";
import { DateField } from "@/components/DateField";
import { useSession } from "@/hooks/useSession";
import { useSettings } from "@/hooks/useSettings";
import { changePassword, logout, partnerName } from "@/lib/auth";
import { formatDateVi } from "@/lib/dates";
import {
  getSupabaseConfig,
  setSupabaseConfig,
  testSupabaseConnection,
} from "@/lib/supabase";

export default function SettingsPage() {
  const session = useSession();
  const { settings, updateSettings } = useSettings();
  const router = useRouter();
  const [modal, setModal] = useState<"password" | "dates" | "sync" | "about" | null>(null);

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMessage, setPwMessage] = useState("");

  const [anniversary, setAnniversary] = useState(settings.anniversary);
  const [nextMeeting, setNextMeeting] = useState(settings.nextMeeting);
  const [datesSaved, setDatesSaved] = useState(false);

  const [syncUrl, setSyncUrl] = useState("");
  const [syncKey, setSyncKey] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const syncEnabled = getSupabaseConfig() !== null;

  if (!session) return null;

  const submitPassword = async () => {
    if (!(await changePassword(session.role, oldPw, newPw))) {
      setPwMessage("Mật khẩu hiện tại chưa đúng.");
      return;
    }
    setPwMessage("");
    setOldPw("");
    setNewPw("");
    setModal(null);
  };

  const submitDates = () => {
    updateSettings({ anniversary, nextMeeting });
    setDatesSaved(true);
    window.setTimeout(() => {
      setDatesSaved(false);
      setModal(null);
    }, 900);
  };

  const submitSync = async () => {
    setSyncBusy(true);
    setSyncMessage("");
    if (!syncUrl.trim() || !syncKey.trim()) {
      setSupabaseConfig(null);
      setSyncMessage("Đã tắt đồng bộ.");
      setSyncBusy(false);
      return;
    }
    setSupabaseConfig({ url: syncUrl.trim(), anonKey: syncKey.trim() });
    const error = await testSupabaseConnection();
    if (error) {
      setSyncMessage(error);
    } else {
      setSyncMessage("✅ Kết nối thành công! Vị trí thật sẽ được đồng bộ.");
    }
    setSyncBusy(false);
  };

  const isFamily = session.kind === "family";

  const rows: Array<{
    icon: LucideIcon;
    label: string;
    badge?: string;
    onClick: () => void;
  }> = [
    {
      icon: KeyRound,
      label: "Đổi mật khẩu",
      onClick: () => {
        setPwMessage("");
        setModal("password");
      },
    },
    {
      icon: RadioTower,
      label: "Đồng bộ vị trí",
      badge: syncEnabled ? "Đang bật" : "Chưa bật",
      onClick: () => {
        const current = getSupabaseConfig();
        setSyncUrl(current?.url ?? "");
        setSyncKey(current?.anonKey ?? "");
        setSyncMessage("");
        setModal("sync");
      },
    },
    // Anniversary & next meeting are the couple's — hidden from family.
    ...(!isFamily
      ? [
          {
            icon: CalendarHeart,
            label: "Ngày kỷ niệm & ngày gặp nhau",
            onClick: () => {
              setAnniversary(settings.anniversary);
              setNextMeeting(settings.nextMeeting);
              setModal("dates");
            },
          },
        ]
      : []),
    { icon: Info, label: "Giới thiệu", onClick: () => setModal("about") },
  ];

  return (
    <div>
      <PageHeader title="Settings" />

      {/* Profile */}
      <section className="card mb-4 flex items-center gap-3.5 p-4">
        <AvatarUploader role={session.role} size="lg" />
        <div>
          <p className="text-sm font-semibold">{session.displayName}</p>
          <p className="text-xs text-muted">
            {isFamily
              ? "Thành viên gia đình 💗"
              : `Trưởng thành bên ${partnerName(session.role)} 💗`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">Chạm ảnh để đổi 📷</p>
        </div>
      </section>

      <section className="card divide-y divide-line">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={() =>
            updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
          }
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-strong">
            {settings.theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
          </span>
          <span className="flex-1 text-sm font-medium">Giao diện</span>
          <span className="text-xs text-muted">
            {settings.theme === "dark" ? "Tối" : "Sáng"}
          </span>
          <ChevronRight size={16} className="text-muted" />
        </button>

        {rows.map(({ icon: Icon, label, badge, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-strong">
              <Icon size={17} />
            </span>
            <span className="flex-1 text-sm font-medium">{label}</span>
            {badge && <span className="text-xs text-muted">{badge}</span>}
            <ChevronRight size={16} className="text-muted" />
          </button>
        ))}

        <div className="flex items-center gap-3 p-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-strong">
            🌐
          </span>
          <span className="flex-1 text-sm font-medium">Ngôn ngữ</span>
          <span className="text-xs text-muted">Tiếng Việt</span>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          logout();
          router.replace("/");
        }}
        className="card mt-4 w-full py-3.5 text-sm font-semibold text-primary-strong transition-transform duration-300 active:scale-[0.98]"
      >
        Đăng xuất
      </button>

      {/* Change password */}
      <Modal open={modal === "password"} title="Đổi mật khẩu" onClose={() => setModal(null)}>
        <div className="space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          {pwMessage && <p className="text-xs text-primary-strong">{pwMessage}</p>}
          <PrimaryButton type="button" onClick={submitPassword} disabled={!oldPw || newPw.length < 4}>
            Lưu mật khẩu mới
          </PrimaryButton>
          <p className="text-center text-[11px] text-muted">
            Mật khẩu mới chỉ áp dụng trên thiết bị này.
          </p>
        </div>
      </Modal>

      {/* Dates */}
      <Modal open={modal === "dates"} title="Những ngày quan trọng 💗" onClose={() => setModal(null)}>
        <div className="space-y-4">
          <DateField
            label="Ngày bắt đầu yêu nhau"
            value={anniversary}
            onChange={setAnniversary}
          />
          <DateField
            label="Ngày gặp nhau lần tới"
            value={nextMeeting}
            onChange={setNextMeeting}
          />
          <PrimaryButton type="button" onClick={submitDates} disabled={datesSaved}>
            {datesSaved ? "Đã lưu ✓" : "Lưu"}
          </PrimaryButton>
          <p className="text-center text-[11px] text-muted">
            Chỉ Hải và Bình chỉnh được — ngày này hiện chung cho cả nhà.
          </p>
        </div>
      </Modal>

      {/* Location sync */}
      <Modal
        open={modal === "sync"}
        title="Đồng bộ vị trí thật 📡"
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-muted">
            Để hai người thấy <b>vị trí thật</b> của nhau trên bản đồ, cần một
            &ldquo;hộp thư chung&rdquo; miễn phí trên supabase.com. Tạo project,
            chạy file <code>supabase/migration.sql</code> trong SQL Editor, rồi
            dán 2 dòng dưới đây — <b>cả hai điện thoại phải dán cùng nội dung</b>.
          </p>
          <Input
            label="Project URL"
            type="url"
            placeholder="https://xxxx.supabase.co"
            value={syncUrl}
            onChange={(e) => setSyncUrl(e.target.value)}
          />
          <Input
            label="Anon key"
            placeholder="eyJhbGciOi..."
            value={syncKey}
            onChange={(e) => setSyncKey(e.target.value)}
          />
          {syncMessage && (
            <p className="text-xs leading-relaxed text-primary-strong">{syncMessage}</p>
          )}
          <PrimaryButton type="button" onClick={() => void submitSync()} disabled={syncBusy}>
            {syncBusy ? "Đang kiểm tra..." : "Lưu & kiểm tra kết nối"}
          </PrimaryButton>
          <p className="text-center text-[11px] text-muted">
            Xóa trống cả hai ô rồi bấm Lưu để tắt đồng bộ.
          </p>
        </div>
      </Modal>

      {/* About */}
      <Modal open={modal === "about"} title="Our Space ❤️" onClose={() => setModal(null)}>
        <div className="space-y-3 text-center">
          <span className="animate-float-soft inline-block text-4xl">❤️</span>
          <p className="text-sm leading-relaxed text-muted">
            &ldquo;Khoảng cách chỉ là bản đồ,
            <br />
            còn trái tim vẫn ở cạnh nhau.&rdquo;
          </p>
          <p className="text-xs text-muted">
            Từ {formatDateVi(settings.anniversary)} · Only for Bình &amp; family
          </p>
        </div>
      </Modal>
    </div>
  );
}
