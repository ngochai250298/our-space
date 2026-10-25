"use client";

import type { Role } from "@/types";

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
 * Sends a square avatar to /api/avatar, which stores the file in R2 and saves
 * its URL on the account — so it shows everywhere (letters, map, profile…).
 * Returns the URL, or null when the upload failed.
 */
export async function uploadAvatar(
  dataUrl: string,
  role: Role
): Promise<string | null> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.set("file", blob, "avatar.jpg");
  form.set("role", role);
  const res = await fetch("/api/avatar", { method: "POST", body: form });
  if (!res.ok) return null;
  const { url } = (await res.json()) as { url: string };
  return url;
}
