import { NextRequest, NextResponse } from "next/server";
import { db, newId, nowIso } from "@/lib/d1";
import { bucket, storageUrl } from "@/lib/r2";

interface GalleryRow {
  id: string;
  album: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
}

/** Rows carry the R2 key; the browser gets a /api/storage URL it can show. */
function withUrl(row: GalleryRow) {
  return { ...row, url: storageUrl(row.storage_path) };
}

export async function GET() {
  const { results } = await db()
    .prepare("SELECT * FROM gallery ORDER BY created_at DESC")
    .all<GalleryRow>();
  return NextResponse.json(results.map(withUrl));
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const album = String(form.get("album") ?? "Kỷ niệm");
  const uploadedBy = String(form.get("uploadedBy") ?? "");
  if (!(file instanceof File) || !uploadedBy)
    return new NextResponse("Thiếu file hoặc người tải lên.", { status: 400 });

  const key = `${uploadedBy}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;
  await bucket().put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "image/jpeg" },
  });

  const id = newId();
  const createdAt = nowIso();
  await db()
    .prepare(
      "INSERT INTO gallery (id, album, storage_path, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, album, key, uploadedBy, createdAt)
    .run();

  return NextResponse.json(
    { id, url: storageUrl(key), storagePath: key },
    { status: 201 }
  );
}
