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

// Private app — fixed accounts. Note: the couple's internal role ids stay
// "anh"/"em" (database rows reference them); only usernames/display names changed.
const ACCOUNTS: Account[] = [
  { username: "hai", password: "2103", role: "anh", displayName: "Hải", kind: "couple", gender: "male" },
  { username: "binh", password: "2502", role: "em", displayName: "Bình", kind: "couple", gender: "female" },
  { username: "thuong", password: "0000", role: "thuong", displayName: "Thương", kind: "family", gender: "female" },
  { username: "thuan", password: "0000", role: "thuan", displayName: "Thuận", kind: "family", gender: "male" },
  { username: "nhinhi", password: "0000", role: "nhinhi", displayName: "Nhinhi", kind: "family", gender: "female" },
  { username: "thinh", password: "0000", role: "thinh", displayName: "Thịnh", kind: "family", gender: "male" },
];

const SESSION_KEY = "session";
const PASSWORD_OVERRIDE_KEY = "passwords";
const ACCOUNTS_TABLE = "accounts";

// ── Cloud-backed account overrides ───────────────────────────────────────────
// The /admin page edits display names + passwords on Supabase so a change made
// from one device applies to everyone. The code ACCOUNTS above stay as the
// offline fallback (and seed), so login never breaks if the table/cloud is
// missing.
interface CloudAccount {
  displayName: string;
  password: string;
  avatarUrl: string | null;
}
let cloudAccounts: Partial<Record<Role, CloudAccount>> = {};
let accountsLoadPromise: Promise<void> | null = null;

/** Fetch account overrides from Supabase once (or force a refresh). */
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
      display_name: string;
      password: string;
      avatar_url?: string | null;
    }>) {
      next[row.role] = {
        displayName: row.display_name,
        password: row.password,
        avatarUrl: row.avatar_url ?? null,
      };
    }
    cloudAccounts = next;
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("ourspace:accounts"));
  })();
  return accountsLoadPromise;
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
    display_name: patch.displayName ?? displayNameOf(role) ?? base.displayName,
    password: patch.password ?? currentPassword(base),
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

/** Uploaded avatar URL for a person, or null to fall back to the emoji. */
export function avatarOf(role: Role): string | null {
  return cloudAccounts[role]?.avatarUrl ?? null;
}

export function accountFor(role: Role): Account {
  return ACCOUNTS.find((a) => a.role === role) ?? ACCOUNTS[0];
}

export interface PublicAccount {
  role: Role;
  displayName: string;
  kind: AccountKind;
  gender: Gender;
}

/** Everyone in the house — for recipient pickers etc. (no credentials). */
export function allAccounts(): PublicAccount[] {
  return ACCOUNTS.map(({ role, kind, gender }) => ({
    role,
    displayName: displayNameOf(role),
    kind,
    gender,
  }));
}

export function displayNameOf(role: Role): string {
  return cloudAccounts[role]?.displayName ?? accountFor(role).displayName;
}

export function genderOf(role: Role): Gender {
  return accountFor(role).gender;
}

function currentPassword(account: Account): string {
  if (cloudAccounts[account.role]) return cloudAccounts[account.role]!.password;
  const overrides = loadItem<Partial<Record<Role, string>>>(PASSWORD_OVERRIDE_KEY, {});
  return overrides[account.role] ?? account.password;
}

function toSession(account: Account): Session {
  return {
    role: account.role,
    displayName: displayNameOf(account.role),
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
  const account = ACCOUNTS.find(
    (a) => a.username === username.trim().toLowerCase()
  );
  if (!account || currentPassword(account) !== password) return null;
  const session = toSession(account);
  saveItem(SESSION_KEY, session);
  return session;
}

export function getSession(): Session | null {
  const stored = loadItem<Session | null>(SESSION_KEY, null);
  if (!stored) return null;
  // Sessions saved by older versions lack kind/gender — backfill them.
  const account = accountFor(stored.role);
  return {
    ...toSession(account),
    loggedInAt: stored.loggedInAt,
  };
}

export function logout(): void {
  removeItem(SESSION_KEY);
}

export async function changePassword(
  role: Role,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const account = ACCOUNTS.find((a) => a.role === role);
  if (!account || currentPassword(account) !== oldPassword) return false;
  // Prefer the shared cloud store so the new password works on every device;
  // keep the localStorage copy as an offline fallback.
  const overrides = loadItem<Partial<Record<Role, string>>>(PASSWORD_OVERRIDE_KEY, {});
  saveItem(PASSWORD_OVERRIDE_KEY, { ...overrides, [role]: newPassword });
  if (getSupabase()) await saveAccount(role, { password: newPassword });
  return true;
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
