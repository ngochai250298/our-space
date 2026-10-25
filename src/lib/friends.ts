"use client";

import type { FriendLink, Role } from "@/types";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

const ENDPOINT = "/api/friend-links";

interface LinkRow {
  id: string;
  role_a: string;
  role_b: string;
  anniversary: string | null;
}

/**
 * A pair is stored once, with the roles sorted — so "thien+yen" and "yen+thien"
 * can't both exist. Everything that writes a link goes through this.
 */
export function orderPair(a: Role, b: Role): [Role, Role] {
  return a < b ? [a, b] : [b, a];
}

function rowToLink(row: LinkRow): FriendLink {
  return {
    id: row.id,
    roleA: row.role_a,
    roleB: row.role_b,
    anniversary: row.anniversary,
  };
}

// ── The pairings, cached ─────────────────────────────────────────────────────
// Who is wired to whom decides who may see whom (see canSee in lib/auth), and
// that question is asked while rendering — so, like the account list, the
// links are kept in a module cache that every read refreshes.
let linkCache: FriendLink[] = [];
let linksLoadPromise: Promise<void> | null = null;

export async function fetchFriendLinks(): Promise<FriendLink[] | null> {
  try {
    const rows = await apiGet<LinkRow[]>(ENDPOINT);
    linkCache = rows.map(rowToLink);
    return linkCache;
  } catch {
    return null;
  }
}

/** Read the pairings once (or force a refresh). */
export function ensureFriendLinksLoaded(force = false): Promise<void> {
  if (!force && linksLoadPromise) return linksLoadPromise;
  linksLoadPromise = fetchFriendLinks().then(() => undefined);
  return linksLoadPromise;
}

/** The pairings as last read — [] until the first read lands. */
export function cachedFriendLinks(): FriendLink[] {
  return linkCache;
}

/** True when the admin wired these two together. */
export function isLinkedPair(a: Role, b: Role): boolean {
  return linkCache.some(
    (l) =>
      (l.roleA === a && l.roleB === b) || (l.roleA === b && l.roleB === a)
  );
}

/** Admin: wire two friends together. */
export async function linkFriends(
  a: Role,
  b: Role
): Promise<{ ok: boolean; error?: string }> {
  if (a === b) return { ok: false, error: "Phải chọn hai người khác nhau." };
  const [roleA, roleB] = orderPair(a, b);
  try {
    await apiPost(ENDPOINT, { role_a: roleA, role_b: roleB });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    return {
      ok: false,
      // The UNIQUE (role_a, role_b) constraint answers with "duplicate".
      error: message.includes("duplicate")
        ? "Hai người này đã được nối dây rồi."
        : `Không nối được — ${message || "lỗi không rõ."}`,
    };
  }
}

export async function unlinkFriends(id: string): Promise<boolean> {
  try {
    await apiDelete(`${ENDPOINT}/${id}`);
    return true;
  } catch {
    return false;
  }
}

/** Admin: set the day a linked pair started dating. */
export async function setLinkAnniversary(
  id: string,
  anniversary: string
): Promise<boolean> {
  try {
    await apiPatch(`${ENDPOINT}/${id}`, { anniversary: anniversary || null });
    return true;
  } catch {
    return false;
  }
}

/** The link a person belongs to, if the admin wired them to someone. */
export function linkFor(links: FriendLink[], role: Role): FriendLink | null {
  return links.find((l) => l.roleA === role || l.roleB === role) ?? null;
}

/** The other person in a link. */
export function partnerInLink(link: FriendLink, role: Role): Role {
  return link.roleA === role ? link.roleB : link.roleA;
}
