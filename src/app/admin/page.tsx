"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarHeart,
  Inbox,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "@/config";
import { Input, PrimaryButton } from "@/components/Field";
import { DateField } from "@/components/DateField";
import { useSettings } from "@/hooks/useSettings";
import { displayNameOf } from "@/lib/auth";
import { formatDateTimeVi, formatDateVi } from "@/lib/dates";
import { useAdminAccounts, type AdminAccount } from "@/features/admin/useAdminAccounts";
import { useAdminStatus } from "@/features/admin/useAdminStatus";
import { AdminFakeGps } from "@/features/admin/AdminFakeGps";
import { useLetters } from "@/features/letters/useLetters";
import { useDiary } from "@/features/diary/useDiary";
import { usePhotos } from "@/features/gallery/usePhotos";
import { useBucketList } from "@/features/bucket/useBucketList";
import { useOpenWhen } from "@/features/openwhen/useOpenWhen";

const SESSION_FLAG = "admin.authed";
const ONLINE_MS = 5 * 60 * 1000;

type Tab = "config" | "accounts" | "content" | "status" | "gps";
type ContentTab = "letters" | "diary" | "photos" | "bucket" | "openwhen";

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_FLAG) === "1");
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!authed) return <AdminGate onOk={() => setAuthed(true)} />;
  return (
    <AdminDashboard
      onLogout={() => {
        sessionStorage.removeItem(SESSION_FLAG);
        setAuthed(false);
      }}
    />
  );
}

/* ── Login gate ─────────────────────────────────────────────────────────── */

function AdminGate({ onOk }: { onOk: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_FLAG, "1");
      onOk();
    } else {
      setError("Sai tài khoản hoặc mật khẩu.");
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-6 text-center">
        <span className="grid mx-auto mb-3 size-12 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
          <ShieldCheck size={24} />
        </span>
        <h1 className="text-xl font-semibold">Trang quản trị</h1>
        <p className="mt-1 text-xs text-muted">Our Space · Admin</p>
      </div>
      <div className="card space-y-4 p-5">
        <Input
          label="Tài khoản"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && <p className="text-xs text-primary-strong">{error}</p>}
        <PrimaryButton type="button" onClick={submit}>
          Đăng nhập
        </PrimaryButton>
      </div>
    </main>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("config");

  const tabs: Array<{ key: Tab; label: string; icon: typeof Activity }> = [
    { key: "config", label: "Cấu hình", icon: CalendarHeart },
    { key: "accounts", label: "Tài khoản", icon: Users },
    { key: "content", label: "Nội dung", icon: Inbox },
    { key: "status", label: "Trạng thái", icon: Activity },
    { key: "gps", label: "Vị trí", icon: MapPin },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Trang quản trị 🛠️</h1>
          <p className="text-xs text-muted">Chỉnh nội dung cho cả nhà, từ bất cứ đâu.</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-full card px-3 py-1.5 text-xs font-semibold text-muted"
        >
          <LogOut size={14} /> Thoát
        </button>
      </header>

      <div className="mb-5 grid grid-cols-5 gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-semibold transition-all ${
              tab === key ? "bg-primary text-white shadow" : "card text-muted"
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>

      {tab === "config" && <ConfigSection />}
      {tab === "accounts" && <AccountsSection />}
      {tab === "content" && <ContentSection />}
      {tab === "status" && <StatusSection />}
      {tab === "gps" && <AdminFakeGps />}
    </main>
  );
}

/* ── Cấu hình (dates) ───────────────────────────────────────────────────── */

function ConfigSection() {
  const { settings, updateSettings } = useSettings();
  const [anniversary, setAnniversary] = useState(settings.anniversary);
  const [nextMeeting, setNextMeeting] = useState(settings.nextMeeting);
  const [label, setLabel] = useState(settings.nextMeetingLabel);
  const [saved, setSaved] = useState(false);

  // Keep local fields in sync when the cloud value arrives/changes.
  useEffect(() => setAnniversary(settings.anniversary), [settings.anniversary]);
  useEffect(() => setNextMeeting(settings.nextMeeting), [settings.nextMeeting]);
  useEffect(() => setLabel(settings.nextMeetingLabel), [settings.nextMeetingLabel]);

  const save = () => {
    updateSettings({ anniversary, nextMeeting, nextMeetingLabel: label.trim() || "Gặp nhau" });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold">Ngày quan trọng (dùng chung cả nhà)</h2>
      <DateField label="Ngày bắt đầu yêu nhau" value={anniversary} onChange={setAnniversary} />
      <DateField label="Ngày gặp nhau lần tới" value={nextMeeting} onChange={setNextMeeting} />
      <Input
        label="Nhãn hiển thị (vd: Gặp nhau)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <PrimaryButton type="button" onClick={save} disabled={saved}>
        {saved ? "Đã lưu ✓" : "Lưu cấu hình"}
      </PrimaryButton>
    </section>
  );
}

/* ── Tài khoản & mật khẩu ───────────────────────────────────────────────── */

function AccountsSection() {
  const { rows, ready, error, save } = useAdminAccounts();

  if (!ready) return <Loading />;
  if (error) return <ErrorNote text={error} />;

  return (
    <section className="space-y-3">
      {rows.map((acc) => (
        <AccountEditor key={acc.role} account={acc} onSave={save} />
      ))}
      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Tên hiển thị & mật khẩu lưu trên Supabase → đổi ở đây áp dụng cho mọi
        điện thoại/máy. Tên đăng nhập (username) giữ nguyên, không đổi được.
      </p>
    </section>
  );
}

function AccountEditor({
  account,
  onSave,
}: {
  account: AdminAccount;
  onSave: (
    role: AdminAccount["role"],
    patch: { displayName?: string; password?: string }
  ) => Promise<boolean>;
}) {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [password, setPassword] = useState(account.password);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  const dirty =
    displayName !== account.displayName || password !== account.password;

  const save = async () => {
    if (!displayName.trim() || !password.trim()) return;
    setStatus("saving");
    const ok = await onSave(account.role, {
      displayName: displayName.trim(),
      password: password.trim(),
    });
    setStatus(ok ? "done" : "error");
    window.setTimeout(() => setStatus("idle"), 1500);
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {displayNameOf(account.role)}
        </span>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary-strong">
          {account.kind === "couple" ? "Cặp đôi" : "Gia đình"} · {account.role}
        </span>
      </div>
      <Input
        label="Tên hiển thị"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <Input
        label="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="button"
        onClick={save}
        disabled={!dirty || status === "saving"}
        className="w-full rounded-2xl bg-ink py-2.5 text-xs font-semibold text-surface transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {status === "saving"
          ? "Đang lưu..."
          : status === "done"
            ? "Đã lưu ✓"
            : status === "error"
              ? "Lỗi — thử lại"
              : "Lưu thay đổi"}
      </button>
    </div>
  );
}

/* ── Nội dung ───────────────────────────────────────────────────────────── */

function ContentSection() {
  const [sub, setSub] = useState<ContentTab>("letters");

  const letters = useLetters(null);
  const diary = useDiary(null);
  const gallery = usePhotos(null);
  const bucket = useBucketList(null);
  const openwhen = useOpenWhen(null);

  const subs: Array<{ key: ContentTab; label: string; count: number }> = [
    { key: "letters", label: "Thư", count: letters.items.length },
    { key: "diary", label: "Nhật ký", count: diary.entries.length },
    { key: "photos", label: "Ảnh", count: gallery.photos.length },
    { key: "bucket", label: "Bucket", count: bucket.items.length },
    { key: "openwhen", label: "Open When", count: openwhen.items.length },
  ];

  const confirmDelete = (msg: string, run: () => void) => {
    if (window.confirm(msg)) run();
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {subs.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSub(s.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              sub === s.key ? "bg-primary text-white shadow" : "card text-muted"
            }`}
          >
            {s.label} · {s.count}
          </button>
        ))}
      </div>

      {sub === "letters" &&
        (letters.items.length === 0 ? (
          <Empty />
        ) : (
          [...letters.items]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((l) => (
              <Row
                key={l.id}
                title={`${displayNameOf(l.from)} → ${displayNameOf(l.to)}: ${l.title}`}
                sub={formatDateTimeVi(l.createdAt)}
                onDelete={() =>
                  confirmDelete("Xóa hẳn lá thư này?", () => void letters.remove(l.id))
                }
              />
            ))
        ))}

      {sub === "diary" &&
        (diary.entries.length === 0 ? (
          <Empty />
        ) : (
          [...diary.entries]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((e) => (
              <Row
                key={e.id}
                title={`${displayNameOf(e.author)} · ${formatDateVi(e.date)}`}
                sub={e.content.slice(0, 80) || "(không có chữ)"}
                onDelete={() =>
                  confirmDelete("Xóa nhật ký này?", () => void diary.removeEntry(e.id))
                }
              />
            ))
        ))}

      {sub === "photos" &&
        (gallery.photos.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gallery.photos.map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? p.album} className="h-24 w-full object-cover" />
                <button
                  type="button"
                  aria-label="Xóa ảnh"
                  onClick={() =>
                    confirmDelete("Xóa tấm ảnh này?", () => void gallery.removePhoto(p))
                  }
                  className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/55 text-white"
                >
                  <Trash2 size={13} />
                </button>
                <span className="absolute bottom-0 left-0 right-0 bg-black/45 px-1.5 py-0.5 text-[9px] text-white">
                  {p.album} · {displayNameOf(p.uploadedBy)}
                </span>
              </div>
            ))}
          </div>
        ))}

      {sub === "bucket" &&
        (bucket.items.length === 0 ? (
          <Empty />
        ) : (
          bucket.items.map((it) => (
            <Row
              key={it.id}
              title={`${it.done ? "✓ " : "○ "}${it.title}`}
              onDelete={() =>
                confirmDelete("Xóa mục này?", () => void bucket.remove(it.id))
              }
            />
          ))
        ))}

      {sub === "openwhen" &&
        (openwhen.items.length === 0 ? (
          <Empty />
        ) : (
          openwhen.items.map((env) => (
            <Row
              key={env.id}
              title={`${env.emoji} ${env.label}`}
              sub={`Từ ${displayNameOf(env.from)}${env.openedAt ? " · đã mở" : ""}`}
              onDelete={() =>
                confirmDelete("Xóa phong bì này?", () => void openwhen.remove(env.id))
              }
            />
          ))
        ))}
    </section>
  );
}

/* ── Trạng thái ─────────────────────────────────────────────────────────── */

function StatusSection() {
  const { rows, ready, error, refresh } = useAdminStatus();

  if (!ready) return <Loading />;
  if (error) return <ErrorNote text={error} />;

  const now = Date.now();

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => void refresh()}
        className="flex items-center gap-1.5 rounded-full card px-3 py-1.5 text-xs font-semibold text-muted"
      >
        <RefreshCw size={13} /> Làm mới
      </button>
      {rows.length === 0 && <Empty />}
      {rows.map((r) => {
        const online = now - r.updatedAt < ONLINE_MS;
        return (
          <div key={r.role} className="card flex items-center gap-3 p-4">
            <span
              className={`size-2.5 shrink-0 rounded-full ${
                online ? "bg-emerald-500" : "bg-line"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{displayNameOf(r.role)}</p>
              <p className="text-[11px] text-muted">
                {online ? "Đang online" : "Ngoại tuyến"} · {formatDateTimeVi(r.updatedAt)}
              </p>
            </div>
            <span className="text-[11px] tabular-nums text-muted">
              {r.lat.toFixed(3)}, {r.lng.toFixed(3)}
            </span>
          </div>
        );
      })}
    </section>
  );
}

/* ── Small shared bits ──────────────────────────────────────────────────── */

function Row({
  title,
  sub,
  onDelete,
}: {
  title: string;
  sub?: string;
  onDelete: () => void;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
      </div>
      <button
        type="button"
        aria-label="Xóa"
        onClick={onDelete}
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-primary-strong"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function Loading() {
  return <p className="card px-4 py-6 text-center text-xs text-muted">Đang tải…</p>;
}

function Empty() {
  return <p className="card px-4 py-6 text-center text-xs text-muted">Chưa có gì ở đây.</p>;
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p className="card px-4 py-4 text-center text-xs leading-relaxed text-primary-strong">
      ⚠️ {text}
    </p>
  );
}
