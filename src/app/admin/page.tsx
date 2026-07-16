"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarHeart,
  Heart,
  HeartCrack,
  Inbox,
  KeyRound,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { ADMIN_USERNAME } from "@/config";
import { Input, PrimaryButton } from "@/components/Field";
import { DateField } from "@/components/DateField";
import { AvatarUploader } from "@/components/AvatarUploader";
import { useSettings } from "@/hooks/useSettings";
import { useFriendLinks } from "@/hooks/useFriendLinks";
import {
  allAccounts,
  canDeleteAccount,
  createAccount,
  deleteAccount,
  displayNameOf,
  ensureAccountsLoaded,
  revokeSessions,
  slugify,
  type NewAccount,
} from "@/lib/auth";
import { linkFriends, setLinkAnniversary, unlinkFriends } from "@/lib/friends";
import type { AccountKind, FriendLink, Role } from "@/types";
import { formatDateTimeVi, formatDateVi } from "@/lib/dates";
import { useAdminAccounts, type AdminAccount } from "@/features/admin/useAdminAccounts";
import { useAdminStatus } from "@/features/admin/useAdminStatus";
import { changeAdminPassword, currentAdminPassword } from "@/features/admin/adminPassword";
import { AdminFakeGps } from "@/features/admin/AdminFakeGps";
import { useLetters } from "@/features/letters/useLetters";
import { useDiary } from "@/features/diary/useDiary";
import { usePhotos } from "@/features/gallery/usePhotos";
import { useBucketList } from "@/features/bucket/useBucketList";
import { useOpenWhen } from "@/features/openwhen/useOpenWhen";

const SESSION_FLAG = "admin.authed";
const ONLINE_MS = 5 * 60 * 1000;

type Tab = "config" | "accounts" | "links" | "content" | "status" | "gps";
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
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    // The password lives on Supabase now (changeable from inside /admin), with
    // the config.ts constant as the offline fallback.
    const expected = await currentAdminPassword();
    setBusy(false);
    if (username.trim() === ADMIN_USERNAME && password === expected) {
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
          onKeyDown={(e) => e.key === "Enter" && void submit()}
        />
        {error && <p className="text-xs text-primary-strong">{error}</p>}
        <PrimaryButton type="button" onClick={() => void submit()} disabled={busy}>
          {busy ? "Đang kiểm tra…" : "Đăng nhập"}
        </PrimaryButton>
      </div>
    </main>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("config");

  // /admin sits outside the (main) layout, which is what normally loads the
  // account list — without this, names of cloud-only accounts wouldn't resolve.
  useEffect(() => {
    void ensureAccountsLoaded(true);
  }, []);

  const tabs: Array<{ key: Tab; label: string; icon: typeof Activity }> = [
    { key: "config", label: "Cấu hình", icon: CalendarHeart },
    { key: "accounts", label: "Tài khoản", icon: Users },
    { key: "links", label: "Nối dây", icon: Heart },
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

      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
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
      {tab === "links" && <LinksSection />}
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
    <div className="space-y-3">
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold">Ngày quan trọng (Hải &amp; Bình)</h2>
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

      <FriendDatesSection />
      <AdminPasswordSection />
    </div>
  );
}

/* ── Ngày kỷ niệm của các cặp bạn bè ────────────────────────────────────── */

/**
 * One anniversary per wired pair. Friends have no "next meeting" date — that
 * one belongs to Hải & Bình — so this is the only date they get.
 */
function FriendDatesSection() {
  const { links, ready } = useFriendLinks();

  if (!ready) return <Loading />;
  if (links.length === 0)
    return (
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Ngày của các cặp bạn bè</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Chưa nối dây cặp nào. Sang tab <b>Nối dây</b> để ghép hai người bạn —
          ngày bắt đầu yêu nhau của họ sẽ hiện ở đây.
        </p>
      </section>
    );

  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold">Ngày của các cặp bạn bè</h2>
      {links.map((link) => (
        <FriendDateRow key={link.id} link={link} />
      ))}
      <p className="text-[11px] leading-relaxed text-muted">
        Đặt ngày xong, hai người trong cặp sẽ thấy bộ đếm &ldquo;đã ở bên nhau X
        ngày&rdquo; ở trang chủ của họ.
      </p>
    </section>
  );
}

function FriendDateRow({ link }: { link: FriendLink }) {
  const [date, setDate] = useState(link.anniversary ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  useEffect(() => setDate(link.anniversary ?? ""), [link.anniversary]);

  const save = async () => {
    setStatus("saving");
    const ok = await setLinkAnniversary(link.id, date);
    setStatus(ok ? "done" : "error");
    window.setTimeout(() => setStatus("idle"), 1500);
  };

  return (
    <div className="rounded-2xl border border-line p-3">
      <p className="mb-2 text-xs font-semibold">
        {displayNameOf(link.roleA)} ❤️ {displayNameOf(link.roleB)}
      </p>
      <DateField label="Ngày bắt đầu yêu nhau" value={date} onChange={setDate} />
      <button
        type="button"
        onClick={() => void save()}
        disabled={status === "saving" || date === (link.anniversary ?? "")}
        className="mt-2 w-full rounded-2xl bg-ink py-2 text-xs font-semibold text-surface transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {status === "saving"
          ? "Đang lưu…"
          : status === "done"
            ? "Đã lưu ✓"
            : status === "error"
              ? "Lỗi — thử lại"
              : "Lưu ngày"}
      </button>
    </div>
  );
}

/* ── Đổi mật khẩu trang /admin ──────────────────────────────────────────── */

function AdminPasswordSection() {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const res = await changeAdminPassword(oldPw, newPw);
    setBusy(false);
    if (res.ok) {
      setOldPw("");
      setNewPw("");
      setMessage({ ok: true, text: "Đã đổi mật khẩu admin ✓" });
    } else {
      setMessage({ ok: false, text: res.error ?? "Không đổi được." });
    }
  };

  return (
    <section className="card space-y-4 p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <KeyRound size={15} /> Mật khẩu trang admin
      </h2>
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
      {message && (
        <p className={`text-xs ${message.ok ? "text-muted" : "text-primary-strong"}`}>
          {message.text}
        </p>
      )}
      <PrimaryButton
        type="button"
        onClick={() => void submit()}
        disabled={busy || !oldPw || !newPw}
      >
        {busy ? "Đang lưu…" : "Đổi mật khẩu"}
      </PrimaryButton>
      <p className="text-[11px] leading-relaxed text-muted">
        Mật khẩu lưu trên Supabase → đổi ở đây là áp dụng ngay, không cần deploy
        lại. ⚠️ Đây vẫn là lớp chặn phía trình duyệt, không phải bảo mật thật.
      </p>
    </section>
  );
}

/* ── Tài khoản & mật khẩu ───────────────────────────────────────────────── */

function AccountsSection() {
  const { rows, ready, error, refresh, save } = useAdminAccounts();

  if (!ready) return <Loading />;
  if (error) return <ErrorNote text={error} />;

  return (
    <section className="space-y-3">
      <NewAccountForm onCreated={() => void refresh()} />
      {rows.map((acc) => (
        <AccountEditor
          key={acc.role}
          account={acc}
          onSave={save}
          onDeleted={() => void refresh()}
        />
      ))}
      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Tên hiển thị & mật khẩu lưu trên Supabase → đổi ở đây áp dụng cho mọi
        điện thoại/máy. Tên đăng nhập (username) giữ nguyên, không đổi được.
      </p>
    </section>
  );
}

/* ── Tạo tài khoản mới ──────────────────────────────────────────────────── */

const KIND_LABEL: Record<AccountKind, string> = {
  couple: "Cặp đôi",
  family: "Gia đình",
  friend: "Bạn bè",
};

function NewAccountForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewAccount>({
    username: "",
    displayName: "",
    password: "",
    kind: "family",
    gender: "female",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = (p: Partial<NewAccount>) => setForm((f) => ({ ...f, ...p }));

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const res = await createAccount(form);
    setBusy(false);
    if (res.ok) {
      setMessage({
        ok: true,
        text: `Đã tạo "${slugify(form.username)}" ✓ — đăng nhập được ngay.`,
      });
      setForm({ username: "", displayName: "", password: "", kind: form.kind, gender: "female" });
      onCreated();
    } else {
      setMessage({ ok: false, text: res.error ?? "Không tạo được." });
    }
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card flex w-full items-center justify-center gap-2 p-4 text-xs font-semibold text-primary-strong"
      >
        <UserPlus size={15} /> Tạo tài khoản mới
      </button>
    );

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <UserPlus size={15} /> Tài khoản mới
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] font-semibold text-muted"
        >
          Đóng
        </button>
      </div>

      <Input
        label="Tên đăng nhập (không dấu, viết liền)"
        value={form.username}
        onChange={(e) => patch({ username: e.target.value })}
      />
      {form.username && slugify(form.username) !== form.username && (
        <p className="text-[11px] text-muted">
          Sẽ lưu thành: <b>{slugify(form.username) || "(trống)"}</b>
        </p>
      )}
      <Input
        label="Tên hiển thị"
        value={form.displayName}
        onChange={(e) => patch({ displayName: e.target.value })}
      />
      <Input
        label="Mật khẩu"
        value={form.password}
        onChange={(e) => patch({ password: e.target.value })}
      />

      <div>
        <p className="mb-1.5 text-[11px] font-medium text-muted">Nhóm</p>
        <div className="grid grid-cols-2 gap-2">
          {(["family", "friend"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => patch({ kind: k })}
              className={`rounded-2xl py-2 text-xs font-semibold transition-all ${
                form.kind === k ? "bg-primary text-white shadow" : "card text-muted"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium text-muted">Giới tính</p>
        <div className="grid grid-cols-2 gap-2">
          {(["female", "male"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => patch({ gender: g })}
              className={`rounded-2xl py-2 text-xs font-semibold transition-all ${
                form.gender === g ? "bg-primary text-white shadow" : "card text-muted"
              }`}
            >
              {g === "female" ? "👩🏻 Nữ" : "👨🏻 Nam"}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className={`text-xs ${message.ok ? "text-muted" : "text-primary-strong"}`}>
          {message.text}
        </p>
      )}
      <PrimaryButton
        type="button"
        onClick={() => void submit()}
        disabled={busy || !form.username || !form.displayName || !form.password}
      >
        {busy ? "Đang tạo…" : "Tạo tài khoản"}
      </PrimaryButton>
      <p className="text-[11px] leading-relaxed text-muted">
        Nhóm <b>Bạn bè</b> thấy định vị của nhau + Hải &amp; Bình, không thấy
        nhóm gia đình (và ngược lại).
      </p>
    </section>
  );
}

function AccountEditor({
  account,
  onSave,
  onDeleted,
}: {
  account: AdminAccount;
  onSave: (
    role: AdminAccount["role"],
    patch: { displayName?: string; password?: string }
  ) => Promise<boolean>;
  onDeleted: () => void;
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
      <div className="flex items-center gap-3">
        <AvatarUploader role={account.role} size="md" />
        <span className="flex-1 text-sm font-semibold">
          {displayNameOf(account.role)}
        </span>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary-strong">
          {KIND_LABEL[account.kind]} · {account.role}
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
      {canDeleteAccount(account.role) && (
        <DeleteAccountButton account={account} onDeleted={onDeleted} />
      )}
    </div>
  );
}

/**
 * Deleting is irreversible and takes the person's content with it, so it asks
 * twice: once inline (guards against a mis-tap) and once in a dialog spelling
 * out what disappears.
 */
function DeleteAccountButton({
  account,
  onDeleted,
}: {
  account: AdminAccount;
  onDeleted: () => void;
}) {
  const [arming, setArming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = displayNameOf(account.role);

  useEffect(() => {
    if (!arming) return;
    const id = window.setTimeout(() => setArming(false), 5000);
    return () => window.clearTimeout(id);
  }, [arming]);

  const submit = async () => {
    const ok = window.confirm(
      `Xoá sạch tài khoản ${name}?\n\n` +
        `Sẽ mất vĩnh viễn: nhật ký, ảnh đã đăng, thư đã gửi VÀ đã nhận, ` +
        `Open When, vị trí và dây nối của ${name}.\n\nKhông hoàn tác được.`
    );
    if (!ok) {
      setArming(false);
      return;
    }
    setBusy(true);
    setError("");
    const res = await deleteAccount(account.role);
    setBusy(false);
    if (res.ok) {
      onDeleted();
    } else {
      setArming(false);
      setError(res.error ?? "Không xoá được.");
    }
  };

  return (
    <>
      {error && <p className="text-xs text-primary-strong">{error}</p>}
      <button
        type="button"
        onClick={() => (arming ? void submit() : setArming(true))}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl py-2 text-[11px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40 ${
          arming
            ? "bg-primary-strong text-white"
            : "border border-line text-muted hover:text-primary-strong"
        }`}
      >
        <Trash2 size={13} />
        {busy
          ? "Đang xoá…"
          : arming
            ? `Chắc chắn xoá ${name}? Bấm lần nữa`
            : "Xoá tài khoản"}
      </button>
    </>
  );
}

/* ── Nối dây bạn bè ─────────────────────────────────────────────────────── */

/**
 * Wire two friends together. A pair gets a dashed line + distance between them
 * on the map (instead of the default line to Bình) and its own anniversary.
 * One person belongs to at most one pair, so anyone already wired is excluded.
 */
function LinksSection() {
  const { links, ready, refresh } = useFriendLinks();
  const [a, setA] = useState<Role | "">("");
  const [b, setB] = useState<Role | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const friends = allAccounts().filter((acc) => acc.kind === "friend");
  const linkedRoles = new Set(links.flatMap((l) => [l.roleA, l.roleB]));
  const free = friends.filter((f) => !linkedRoles.has(f.role));

  const submit = async () => {
    if (!a || !b) return;
    setBusy(true);
    setError("");
    const res = await linkFriends(a, b);
    setBusy(false);
    if (res.ok) {
      setA("");
      setB("");
      void refresh();
    } else {
      setError(res.error ?? "Không nối được.");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Gỡ dây cặp này? Ngày kỷ niệm của họ cũng mất theo.")) return;
    await unlinkFriends(id);
    void refresh();
  };

  if (!ready) return <Loading />;

  return (
    <section className="space-y-3">
      <div className="card space-y-3 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Heart size={15} /> Nối hai người bạn
        </h2>

        {friends.length < 2 ? (
          <p className="text-[11px] leading-relaxed text-muted">
            Cần ít nhất 2 tài khoản nhóm <b>Bạn bè</b>. Sang tab{" "}
            <b>Tài khoản</b> để tạo thêm.
          </p>
        ) : free.length < 2 ? (
          <p className="text-[11px] leading-relaxed text-muted">
            Mọi người bạn đều đã được nối dây rồi. Gỡ một cặp bên dưới nếu muốn
            ghép lại.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FriendPicker label="Người thứ nhất" value={a} exclude={b} options={free} onChange={setA} />
              <FriendPicker label="Người thứ hai" value={b} exclude={a} options={free} onChange={setB} />
            </div>
            {error && <p className="text-xs text-primary-strong">{error}</p>}
            <PrimaryButton
              type="button"
              onClick={() => void submit()}
              disabled={busy || !a || !b || a === b}
            >
              {busy ? "Đang nối…" : "❤️ Nối dây"}
            </PrimaryButton>
          </>
        )}
      </div>

      {links.length === 0 ? (
        <Empty />
      ) : (
        links.map((link) => (
          <div key={link.id} className="card flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {displayNameOf(link.roleA)} ❤️ {displayNameOf(link.roleB)}
              </p>
              <p className="truncate text-[11px] text-muted">
                {link.anniversary
                  ? `Từ ${formatDateVi(link.anniversary)}`
                  : "Chưa đặt ngày — vào tab Cấu hình"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Gỡ dây"
              onClick={() => void remove(link.id)}
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-primary-strong"
            >
              <HeartCrack size={16} />
            </button>
          </div>
        ))
      )}

      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Nối dây xong, hai người sẽ thấy đường kẻ &amp; khoảng cách tới nhau trên
        bản đồ, thay vì tới Bình như mặc định.
      </p>
    </section>
  );
}

function FriendPicker({
  label,
  value,
  exclude,
  options,
  onChange,
}: {
  label: string;
  value: Role | "";
  exclude: Role | "";
  options: Array<{ role: Role; displayName: string }>;
  onChange: (role: Role) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        <option value="">— chọn —</option>
        {options
          .filter((o) => o.role !== exclude)
          .map((o) => (
            <option key={o.role} value={o.role}>
              {o.displayName}
            </option>
          ))}
      </select>
    </label>
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
    { key: "bucket", label: "Mục tiêu", count: bucket.items.length },
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
        const online = r.position ? now - r.position.updatedAt < ONLINE_MS : false;
        return (
          <div key={r.role} className="card p-4">
            <div className="flex items-center gap-3">
              <span
                className={`size-2.5 shrink-0 rounded-full ${
                  online ? "bg-emerald-500" : "bg-line"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {displayNameOf(r.role)}{" "}
                  <span className="text-[10px] font-medium text-muted">
                    · {KIND_LABEL[r.kind]}
                  </span>
                </p>
                <p className="text-[11px] text-muted">
                  {r.position
                    ? `${online ? "Đang online" : "Ngoại tuyến"} · ${formatDateTimeVi(r.position.updatedAt)}`
                    : "Chưa từng chia sẻ vị trí"}
                </p>
              </div>
              {r.position && (
                <span className="text-[11px] tabular-nums text-muted">
                  {r.position.lat.toFixed(3)}, {r.position.lng.toFixed(3)}
                </span>
              )}
            </div>
            <RevokeButton role={r.role} />
          </div>
        );
      })}
      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Ngắt đăng nhập = đá người đó ra khỏi mọi máy đang đăng nhập. Máy đang
        offline sẽ bị đá ngay khi có mạng trở lại. Họ vẫn đăng nhập lại được
        bằng mật khẩu cũ — đổi mật khẩu ở tab Tài khoản nếu muốn chặn hẳn.
      </p>
    </section>
  );
}

function RevokeButton({ role }: { role: Role }) {
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async () => {
    if (!window.confirm(`Ngắt đăng nhập của ${displayNameOf(role)} trên mọi máy?`))
      return;
    setStatus("busy");
    const ok = await revokeSessions(role);
    setStatus(ok ? "done" : "error");
    window.setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void submit()}
      disabled={status === "busy"}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-line py-2 text-[11px] font-semibold text-muted transition-colors hover:text-primary-strong disabled:opacity-40"
    >
      <LogOut size={13} />
      {status === "busy"
        ? "Đang ngắt…"
        : status === "done"
          ? "Đã ngắt ✓"
          : status === "error"
            ? "Lỗi — đã chạy migration9 chưa?"
            : "Ngắt đăng nhập"}
    </button>
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
