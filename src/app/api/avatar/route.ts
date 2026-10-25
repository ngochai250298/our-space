import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/d1";
import { bucket, storageUrl } from "@/lib/r2";

/** Avatars go to R2 under avatars/<role>-<timestamp>.jpg. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const role = String(form.get("role") ?? "");
  if (!(file instanceof File) || !role)
    return new NextResponse("Thiếu file hoặc role.", { status: 400 });

  const key = `avatars/${role}-${Date.now()}.jpg`;
  await bucket().put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "image/jpeg" },
  });

  const url = storageUrl(key);
  await db()
    .prepare("UPDATE accounts SET avatar_url = ?, updated_at = ? WHERE role = ?")
    .bind(url, nowIso(), role)
    .run();
  return NextResponse.json({ url });
}
