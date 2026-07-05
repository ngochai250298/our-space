"use client";

import type { Role } from "@/types";
import { getSupabase } from "@/lib/supabase";
import { saveAccount } from "@/lib/auth";

const BUCKET = "photos";

/** Center-crops an image file to a square and downscales it to `size` px. */
export function fileToSquareDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas không khả dụng"));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh"));
    };
    img.src = url;
  });
}

/**
 * Uploads a square avatar to Storage and saves its URL on the account, so it
 * shows everywhere (letters, map, profile…). Returns the URL or null on error.
 */
export async function uploadAvatar(
  dataUrl: string,
  role: Role
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const blob = await (await fetch(dataUrl)).blob();
  // Unique path → always an insert (no Storage "update" policy needed).
  const path = `avatars/${role}-${Date.now()}.jpg`;
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) return null;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  const ok = await saveAccount(role, { avatarUrl: data.publicUrl });
  return ok ? data.publicUrl : null;
}
