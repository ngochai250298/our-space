import type {
  AccountKind,
  CoupleRole,
  Gender,
  Role,
  Session,
} from "@/types";
import { loadItem, saveItem, removeItem } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

interface Account {
  username: string;
  password: string;
  role: Role;
  displayName: string;
  kind: AccountKind;
  gender: Gender;
}

// Private app — these are the accounts baked into the code. Since migration9
// the real source of truth is the Supabase `accounts` table (the admin can add
// people from /admin), and this list is only the offline fallback + seed, so
// login still works if the cloud is unreachable.
// Note: the couple's internal role ids stay "anh"/"em" (database rows
// reference them); only usernames/display names changed.
const ACCOUNTS: Account[] = [
  { username: "hai", password: "2103", role: "anh", displayName: "Hải", kind: "couple", gender: "male" },
  { username: "binh", password: "2502", role: "em", displayName: "Bình", kind: "couple", gender: "female" },
  { username: "thuong", password: "0000", role: "thuong", displayName: "Thương", kind: "family", gender: "female" },
  { username: "thuan", password: "0000", role: "thuan", displayName: "Thuận", kind: "family", gender: "male" },
  { username: "nhinhi", password: "0000", role: "nhinhi", displayName: "Nhinhi", kind: "family", gender: "female" },
  { username: "thinh", password: "0000", role: "thinh", displayName: "Thịnh", kind: "family", gender: "male" },
  { username: "thien", password: "1111", role: "thien", displayName: "Thiên", kind: "friend", gender: "male" },
  { username: "yen", password: "1111", role: "yen", displayName: "Yến", kind: "friend", gender: "female" },
];

const SESSION_KEY = "session";
const PASSWORD_OVERRIDE_KEY = "passwords";
const ACCOUNTS_TABLE = "accounts";

// ── Cloud-backed accounts ────────────────────────────────────────────────────
// The /admin page creates accounts and edits display names + passwords on
// Supabase so a change made from one device applies to everyone. The ACCOUNTS
// list above stays as the offline fallback (and seed), so login never breaks if
// the table/cloud is missing.
interface CloudAccount {
  username?: string;
  displayName: string;
  password: string;
  kind?: AccountKind;
  gender?: Gender;
  avatarUrl: string | null;
  /** Sessions started before this moment (ms) are kicked out. */
  revokedAt: number | null;
}
let cloudAccounts: Partial<Record<Role, CloudAccount>> = {};
let accountsLoadPromise: Promise<void> | null = null;
/**
 * True once we've actually read the accounts table. Until then we can't tell
 * "this account was deleted" from "we haven't looked yet", and we must not
 * sign anyone out on a guess.
 */
let cloudLoaded = false;

/** Fetch accounts from Supabase once (or force a refresh). */
export async function ensureAccountsLoaded(force = false): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (!force && accountsLoadPromise) return accountsLoadPromise;
  accountsLoadPromise = (async () => {
    const { data, error } = await sb.from(ACCOUNTS_TABLE).select("*");
    if (error || !data) return;
    const next: Partial<Record<Role, CloudAccount>> = {};
    for (const row of data as Array<{
      role: Role;
      username?: string | null;
      display_name: string;
      password: string;
      kind?: string | null;
      gender?: string | null;
      avatar_url?: string | null;
      revoked_at?: string | null;
    }>) {
      next[row.role] = {
        // username/kind/gender/revoked_at only exist after migration9 — until
        // then they read as undefined and the code list fills the gap.
        username: row.username ?? undefined,
        displayName: row.display_name,
        password: row.password,
        kind: (row.kind as AccountKind | undefined) ?? undefined,
        gender: (row.gender as Gender | undefined) ?? undefined,
        avatarUrl: row.avatar_url ?? null,
        revokedAt: row.revoked_at ? Date.parse(row.revoked_at) : null,
      };
    }
    cloudAccounts = next;
    cloudLoaded = true;
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("ourspace:accounts"));
  })();
  return accountsLoadPromise;
}

/**
 * Every account that exists.
 *
 * Once the accounts table has been read it is the ONLY source of truth: an
 * account the admin deleted must not come back to life from the code list
 * below (it would still accept its old password). The code list is used only
 * when we haven't reached the cloud — offline, or before the first read.
 */
function roster(): Account[] {
  const roles = Object.keys(cloudAccounts);
  if (!cloudLoaded || roles.length === 0) return ACCOUNTS;
  return roles.map((role) => {
    const cloud = cloudAccounts[role]!;
    // The code entry still supplies username/kind/gender for rows written
    // before migration9 added those columns.
    const base = ACCOUNTS.find((a) => a.role === role);
    return {
      role,
      username: cloud.username ?? base?.username ?? role,
      displayName: cloud.displayName,
      password: cloud.password,
      kind: cloud.kind ?? base?.kind ?? "family",
      gender: cloud.gender ?? base?.gender ?? "female",
    };
  });
}

/** Uploaded avatar URL for a person, or null to fall back to the emoji. */
export function avatarOf(role: Role): string | null {
  return cloudAccounts[role]?.avatarUrl ?? null;
}

/**
 * The account for a role, or undefined if we've never heard of it. Callers must
 * handle undefined — never fall back to "the first account", which used to
 * silently turn an unknown role into the admin.
 */
export function accountFor(role: Role): Account | undefined {
  return roster().find((a) => a.role === role);
}

export interface PublicAccount {
  role: Role;
  displayName: string;
  kind: AccountKind;
  gender: Gender;
}

/** Everyone in the house — for recipient pickers etc. (no credentials). */
export function allAccounts(): PublicAccount[] {
  return roster().map(({ role, displayName, kind, gender }) => ({
    role,
    displayName,
    kind,
    gender,
  }));
}

export function displayNameOf(role: Role): string {
  return accountFor(role)?.displayName ?? role;
}

export function genderOf(role: Role): Gender {
  return accountFor(role)?.gender ?? "female";
}

/** Which group a person belongs to. Unknown roles get the restricted default. */
export function kindOf(role: Role): AccountKind {
  return accountFor(role)?.kind ?? "family";
}

function currentPassword(account: Account): string {
  if (cloudAccounts[account.role]) return cloudAccounts[account.role]!.password;
  const overrides = loadItem<Partial<Record<Role, string>>>(PASSWORD_OVERRIDE_KEY, {});
  return overrides[account.role] ?? account.password;
}

function toSession(account: Account): Session {
  return {
    role: account.role,
    displayName: account.displayName,
    kind: account.kind,
    gender: account.gender,
    loggedInAt: Date.now(),
  };
}

export async function login(
  username: string,
  password: string
): Promise<Session | null> {
  // Pull the latest passwords/names so an admin change applies immediately.
  await ensureAccountsLoaded(true);
  const account = roster().find(
    (a) => a.username === username.trim().toLowerCase()
  );
  if (!account || currentPassword(account) !== password) return null;
  const session = toSession(account);
  saveItem(SESSION_KEY, session);
  return session;
}

export function getSession(): Session | null {
  const stored = loadItem<Session | null>(SESSION_KEY, null);
  if (!stored?.role) return null;
  // Overlay the current name/kind/gender (the admin may have changed them),
  // but keep the stored values for an account we can't resolve yet — e.g. the
  // cloud list hasn't loaded on this render.
  const account = accountFor(stored.role);
  return {
    role: stored.role,
    displayName: account?.displayName ?? stored.displayName,
    kind: account?.kind ?? stored.kind,
    gender: account?.gender ?? stored.gender,
    loggedInAt: stored.loggedInAt,
  };
}

export function logout(): void {
  removeItem(SESSION_KEY);
}

/**
 * True when the admin cut this session off from /admin after it signed in.
 * Only meaningful once the cloud accounts have loaded.
 */
export function isSessionRevoked(session: Session): boolean {
  const revokedAt = cloudAccounts[session.role]?.revokedAt;
  return revokedAt != null && session.loggedInAt < revokedAt;
}

/**
 * True when this account no longer exists — the admin deleted it while the
 * person was signed in. Answers "false" until the cloud list has loaded, so a
 * device that can't reach Supabase is never signed out on a guess.
 */
export function isAccountGone(session: Session): boolean {
  if (!cloudLoaded || Object.keys(cloudAccounts).length === 0) return false;
  return !cloudAccounts[session.role];
}

/** Hải and Bình are wired into the map, the shared dates and the admin check. */
export function canDeleteAccount(role: Role): boolean {
  return role !== "anh" && role !== "em";
}

/** Admin: kick a person off every device they're signed in on. */
export async function revokeSessions(role: Role): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from(ACCOUNTS_TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq("role", role);
  if (error) return false;
  await ensureAccountsLoaded(true);
  return true;
}

/** Admin/user: change a display name, password and/or avatar for everyone. */
export async function saveAccount(
  role: Role,
  patch: { displayName?: string; password?: string; avatarUrl?: string | null }
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const base = accountFor(role);
  const row: Record<string, unknown> = {
    role,
    display_name: patch.displayName ?? displayNameOf(role),
    password: patch.password ?? (base ? currentPassword(base) : ""),
    updated_at: new Date().toISOString(),
  };
  // Only touch avatar_url when actually changing it, so name/password saves
  // still work even before migration8 adds the column.
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  const { error } = await sb.from(ACCOUNTS_TABLE).upsert(row);
  if (error) return false;
  await ensureAccountsLoaded(true);
  return true;
}

// Combining accents left behind by NFD ("ế" → "e" + ◌́), i.e. U+0300–U+036F.
const COMBINING_MARKS = new RegExp("[̀-ͯ]", "g");

export async function changePassword(
  role: Role,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const account = accountFor(role);
  if (!account || currentPassword(account) !== oldPassword) return false;
  // Prefer the shared cloud store so the new password works on every device;
  // keep the localStorage copy as an offline fallback.
  const overrides = loadItem<Partial<Record<Role, string>>>(PASSWORD_OVERRIDE_KEY, {});
  saveItem(PASSWORD_OVERRIDE_KEY, { ...overrides, [role]: newPassword });
  if (getSupabase()) await saveAccount(role, { password: newPassword });
  return true;
}

/** Turn "Thiên Ân" into "thienan" — usable as a username/role id. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export interface NewAccount {
  username: string;
  displayName: string;
  password: string;
  kind: Exclude<AccountKind, "couple">;
  gender: Gender;
}

/**
 * Admin: create an account. The role id is derived from the username, so it's
 * stable and readable in every table that references it.
 */
export async function createAccount(
  input: NewAccount
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Chưa cấu hình Supabase." };

  const username = slugify(input.username);
  const displayName = input.displayName.trim();
  const password = input.password.trim();
  if (!username) return { ok: false, error: "Tên đăng nhập không hợp lệ." };
  if (!displayName) return { ok: false, error: "Chưa nhập tên hiển thị." };
  if (!password) return { ok: false, error: "Chưa nhập mật khẩu." };

  await ensureAccountsLoaded(true);
  if (roster().some((a) => a.username === username || a.role === username))
    return { ok: false, error: `Tên đăng nhập "${username}" đã có người dùng.` };

  const { error } = await sb.from(ACCOUNTS_TABLE).insert({
    role: username,
    username,
    display_name: displayName,
    password,
    kind: input.kind,
    gender: input.gender,
    updated_at: new Date().toISOString(),
  });
  if (error)
    return {
      ok: false,
      error: `Không tạo được — đã chạy migration9_friends.sql chưa? (${error.message})`,
    };
  await ensureAccountsLoaded(true);
  return { ok: true };
}

const PHOTO_BUCKET = "photos";

/**
 * Admin: delete an account and everything it left behind — diary entries,
 * gallery photos (files included), letters sent AND received, Open When
 * envelopes, last position, and any friend link.
 *
 * There is no undo. Content is removed rather than orphaned, so nothing is
 * left showing a raw role id where a name used to be.
 */
export async function deleteAccount(
  role: Role
): Promise<{ ok: boolean; error?: string }> {
  if (!canDeleteAccount(role))
    return { ok: false, error: "Không thể xoá tài khoản của Hải hoặc Bình." };
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Chưa cấu hình Supabase." };

  // 1. Storage files: gallery uploads (paths recorded per row) + avatars
  //    (named "avatars/<role>-<timestamp>.jpg").
  const { data: photoRows } = await sb
    .from("gallery")
    .select("storage_path")
    .eq("uploaded_by", role);
  const paths = ((photoRows ?? []) as Array<{ storage_path: string | null }>)
    .map((p) => p.storage_path)
    .filter((p): p is string => !!p);

  const { data: avatarFiles } = await sb.storage
    .from(PHOTO_BUCKET)
    .list("avatars", { limit: 1000 });
  const avatarPaths = (avatarFiles ?? [])
    .filter((f) => f.name.startsWith(`${role}-`))
    .map((f) => `avatars/${f.name}`);

  const allFiles = [...paths, ...avatarPaths];
  if (allFiles.length > 0) await sb.storage.from(PHOTO_BUCKET).remove(allFiles);

  // 2. Rows that reference this person.
  await sb.from("gallery").delete().eq("uploaded_by", role);
  await sb.from("diary").delete().eq("author", role);
  await sb.from("letters").delete().or(`from_role.eq.${role},to_role.eq.${role}`);
  await sb.from("open_when").delete().eq("from_role", role);
  await sb.from("locations").delete().eq("role", role);
  await sb.from("friend_links").delete().or(`role_a.eq.${role},role_b.eq.${role}`);

  // 3. The account itself, last — if this fails the person still exists.
  const { error } = await sb.from("accounts").delete().eq("role", role);
  if (error)
    return {
      ok: false,
      error: `Không xoá được — đã chạy migration10_delete_account.sql chưa? (${error.message})`,
    };

  await ensureAccountsLoaded(true);
  // The row is gone; if it somehow survived, say so rather than claim success.
  if (cloudAccounts[role])
    return {
      ok: false,
      error: "Xoá không thành công — tài khoản vẫn còn (thiếu policy delete?).",
    };
  return { ok: true };
}

/** Hải is the admin — can delete anyone's photos and diary entries. */
export function isAdmin(role: Role): boolean {
  return role === "anh";
}

/** The other half — only meaningful for the couple. */
export function partnerOf(role: Role): CoupleRole | null {
  if (role === "anh") return "em";
  if (role === "em") return "anh";
  return null;
}

export function partnerName(role: Role): string {
  const partner = partnerOf(role);
  return partner ? displayNameOf(partner) : "gia đình";
}

/**
 * Whether `viewer` is allowed to see `target` and the things target shares —
 * their position on the map, the photos they upload, and their name in a
 * letter's recipient picker.
 *
 * The couple sees everyone. Family and friends are separate circles that can't
 * see each other — each sees their own circle plus Hải and Bình.
 */
export function canSee(viewer: Role, target: Role): boolean {
  if (viewer === target) return true;
  const viewerKind = kindOf(viewer);
  if (viewerKind === "couple") return true;
  const targetKind = kindOf(target);
  if (targetKind === "couple") return true;
  return viewerKind === targetKind;
}
