"use client";

import type { DiaryEntry, Role } from "@/types";
import { getSupabase, liveTopic } from "@/lib/supabase";

/**
 * Cloud diary: rows in the "diary" table (see supabase/migration2_gallery.sql).
 * Both people read and write the same table, so nothing is ever lost when a
 * phone is turned off or the browser cache is cleared.
 */
interface DiaryRow {
  id: string;
  author: Role;
  date: string;
  content: string;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export function cloudDiaryEnabled(): boolean {
  return getSupabase() !== null;
}

function rowToEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    author: row.author,
    date: row.date,
    content: row.content,
    photos: Array.isArray(row.photos) ? row.photos : [],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function listCloudDiary(): Promise<DiaryEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("diary")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DiaryRow[]).map(rowToEntry);
}

export async function addCloudDiary(entry: {
  author: Role;
  date: string;
  content: string;
  photos: string[];
  createdAt?: number;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Chưa cấu hình đồng bộ.");
  const { error } = await sb.from("diary").insert({
    author: entry.author,
    date: entry.date,
    content: entry.content,
    photos: entry.photos,
    ...(entry.createdAt
      ? { created_at: new Date(entry.createdAt).toISOString() }
      : {}),
  });
  if (error) throw new Error(error.message);
}

export async function updateCloudDiary(
  id: string,
  patch: { date: string; content: string; photos: string[] }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Chưa cấu hình đồng bộ.");
  const { error } = await sb
    .from("diary")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCloudDiary(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("diary").delete().eq("id", id);
}

export function subscribeDiary(onChange: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel(liveTopic("diary-live"))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "diary" },
      onChange
    )
    .subscribe();
  return () => void sb.removeChannel(channel);
}
