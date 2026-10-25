"use client";

import type { Photo, Role } from "@/types";
import { apiGet, apiDelete } from "@/lib/api";

/**
 * Cloud gallery: files live in the R2 bucket, metadata in the D1 "gallery"
 * table, both behind /api/gallery. The route hands back a /api/storage URL
 * for each row, so the bucket itself stays private.
 */
interface GalleryRow {
  id: string;
  album: string;
  url: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: Role;
  created_at: string;
}

/** No realtime channel on D1 — the gallery polls instead. */
const POLL_MS = 5000;

/** Kept for the call sites: the cloud is always there now. */
export function cloudGalleryEnabled(): boolean {
  return true;
}

function rowToPhoto(row: GalleryRow): Photo {
  return {
    id: row.id,
    album: row.album,
    url: row.url,
    storagePath: row.storage_path,
    caption: row.caption ?? undefined,
    uploadedBy: row.uploaded_by,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function listCloudPhotos(): Promise<Photo[]> {
  const rows = await apiGet<GalleryRow[]>("/api/gallery");
  return rows.map(rowToPhoto);
}

export async function uploadCloudPhoto(
  dataUrl: string,
  album: string,
  uploadedBy: Role
): Promise<{ id: string; url: string; storagePath: string }> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.set("file", blob, "photo.jpg");
  form.set("album", album);
  form.set("uploadedBy", uploadedBy);
  const res = await fetch("/api/gallery", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function deleteCloudPhoto(photo: Photo): Promise<void> {
  await apiDelete(`/api/gallery/${photo.id}`).catch(() => {});
}

/** Refreshes when either person adds/removes a photo. */
export function subscribeGallery(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, POLL_MS);
  return () => window.clearInterval(timer);
}
