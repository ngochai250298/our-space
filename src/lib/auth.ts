import type {
  AccountKind,
  CoupleRole,
  Gender,
  Role,
  Session,
} from "@/types";
import { loadItem, saveItem, removeItem } from "@/lib/storage";

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
  { username: "thuong", password: "0000", role: "thuong", displayName: "Thuong", kind: "family", gender: "female" },
  { username: "thuan", password: "0000", role: "thuan", displayName: "Thuan", kind: "family", gender: "male" },
  { username: "nhinhi", password: "0000", role: "nhinhi", displayName: "Nhinhi", kind: "family", gender: "female" },
  { username: "thinh", password: "0000", role: "thinh", displayName: "Thinh", kind: "family", gender: "male" },
];

const SESSION_KEY = "session";
const PASSWORD_OVERRIDE_KEY = "passwords";

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
  return ACCOUNTS.map(({ role, displayName, kind, gender }) => ({
    role,
    displayName,
    kind,
    gender,
  }));
}

export function displayNameOf(role: Role): string {
  return accountFor(role).displayName;
}

export function genderOf(role: Role): Gender {
  return accountFor(role).gender;
}

function currentPassword(account: Account): string {
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

export function login(username: string, password: string): Session | null {
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

export function changePassword(role: Role, oldPassword: string, newPassword: string): boolean {
  const account = ACCOUNTS.find((a) => a.role === role);
  if (!account || currentPassword(account) !== oldPassword) return false;
  const overrides = loadItem<Partial<Record<Role, string>>>(PASSWORD_OVERRIDE_KEY, {});
  saveItem(PASSWORD_OVERRIDE_KEY, { ...overrides, [role]: newPassword });
  return true;
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
