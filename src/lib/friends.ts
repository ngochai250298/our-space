"use client";

import type { FriendLink, Role } from "@/types";
import { getSupabase } from "@/lib/supabase";

const TABLE = "friend_links";

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

export async function fetchFriendLinks(): Promise<FriendLink[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from(TABLE).select("*");
  if (error || !data) return null;
  return (data as LinkRow[]).map(rowToLink);
}

/** Admin: wire two friends together. */
export async function linkFriends(
  a: Role,
  b: Role
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Chưa cấu hình Supabase." };
  if (a === b) return { ok: false, error: "Phải chọn hai người khác nhau." };
  const [roleA, roleB] = orderPair(a, b);
  const { error } = await sb.from(TABLE).insert({ role_a: roleA, role_b: roleB });
  if (error)
    return {
      ok: false,
      error: error.message.includes("duplicate")
        ? "Hai người này đã được nối dây rồi."
        : `Không nối được — đã chạy migration9_friends.sql chưa? (${error.message})`,
    };
  return { ok: true };
}

export async function unlinkFriends(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  return !error;
}

/** Admin: set the day a linked pair started dating. */
export async function setLinkAnniversary(
  id: string,
  anniversary: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from(TABLE)
    .update({ anniversary: anniversary || null })
    .eq("id", id);
  return !error;
}

/** The link a person belongs to, if the admin wired them to someone. */
export function linkFor(links: FriendLink[], role: Role): FriendLink | null {
  return links.find((l) => l.roleA === role || l.roleB === role) ?? null;
}

/** The other person in a link. */
export function partnerInLink(link: FriendLink, role: Role): Role {
  return link.roleA === role ? link.roleB : link.roleA;
}
