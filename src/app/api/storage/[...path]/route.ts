import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/lib/r2";

/**
 * Serves a file straight out of the private R2 bucket, so photos and avatars
 * need no public bucket URL. Keys never change, hence the immutable cache.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
  const object = await bucket().get(key);
  if (!object) return new NextResponse("Not found", { status: 404 });

  const headers = new Headers();
  headers.set(
    "content-type",
    object.httpMetadata?.contentType ?? "application/octet-stream"
  );
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-length", String(object.size));
  return new NextResponse(object.body, { headers });
}
