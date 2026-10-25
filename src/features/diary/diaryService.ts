"use client";

import type { DiaryEntry, Role } from "@/types";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

/**
 * Cloud diary: rows in the D1 "diary" table behind /api/diary. Both people
 * read and write the same table, so nothing is ever lost when a phone is
 * turned off or the browser cache is cleared.
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
  const rows = await apiGet<DiaryRow[]>("/api/diary");
  return rows.map(rowToEntry);
}

export async function addCloudDiary(entry: {
  author: Role;
  date: string;
  content: string;
  photos: string[];
  createdAt?: number;
}): Promise<void> {
  await apiPost("/api/diary", {
    author: entry.author,
    date: entry.date,
    content: entry.content,
    photos: entry.photos,
    ...(entry.createdAt
      ? { created_at: new Date(entry.createdAt).toISOString() }
      : {}),
  });
}

export async function updateCloudDiary(
  id: string,
  patch: { date: string; content: string; photos: string[] }
): Promise<void> {
  // updated_at is bumped by the route (touchColumn).
  await apiPatch(`/api/diary/${id}`, patch);
}

export async function deleteCloudDiary(id: string): Promise<void> {
  await apiDelete(`/api/diary/${id}`).catch(() => {});
}
