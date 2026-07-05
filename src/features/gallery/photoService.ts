"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Photo, Role } from "@/types";
import { getSupabase, liveTopic } from "@/lib/supabase";

/**
 * Cloud gallery: files live in the Supabase Storage bucket "photos",
 * metadata in the "gallery" table (see supabase/migration2_gallery.sql).
 * One person uploads → the other sees it instantly via realtime.
 */
const BUCKET = "photos";

interface GalleryRow {
  id: string;
  album: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: Role;
  created_at: string;
}

export function cloudGalleryEnabled(): boolean {
  return getSupabase() !== null;
}

function rowToPhoto(row: GalleryRow, sb: SupabaseClient): Photo {
  const { data } = sb.storage.from(BUCKET).getPublicUrl(row.storage_path);
  return {
    id: row.id,
    album: row.album,
    url: data.publicUrl,
    storagePath: row.storage_path,
    caption: row.caption ?? undefined,
    uploadedBy: row.uploaded_by,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function listCloudPhotos(): Promise<Photo[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as GalleryRow[]).map((row) => rowToPhoto(row, sb));
}

export async function uploadCloudPhoto(
  dataUrl: string,
  album: string,
  uploadedBy: Role
): Promise<{ url: string; storagePath: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Chưa cấu hình đồng bộ.");
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${uploadedBy}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;
  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });
  if (uploadError) throw new Error(uploadError.message);
  const { error: insertError } = await sb
    .from("gallery")
    .insert({ album, storage_path: path, uploaded_by: uploadedBy });
  if (insertError) throw new Error(insertError.message);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, storagePath: path };
}

export async function deleteCloudPhoto(photo: Photo): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (photo.storagePath)
    await sb.storage.from(BUCKET).remove([photo.storagePath]);
  await sb.from("gallery").delete().eq("id", photo.id);
}

/** Refreshes when either person adds/removes a photo. */
export function subscribeGallery(onChange: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel(liveTopic("gallery-live"))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "gallery" },
      onChange
    )
    .subscribe();
  return () => void sb.removeChannel(channel);
}
