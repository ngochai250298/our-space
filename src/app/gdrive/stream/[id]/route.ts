import type { NextRequest } from "next/server";

/**
 * Audio proxy for the playlist — runs in dev and on Cloudflare (OpenNext).
 *
 * Google blocks <audio> tags on other sites from streaming Drive files
 * (403 on Sec-Fetch-Dest: audio), but serves clean server-side requests
 * fine — including Range requests (206) so seeking works.
 */
const UPSTREAM = "https://drive.usercontent.google.com/download";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[-\w]{10,}$/.test(id)) return new Response("Bad id", { status: 400 });

  const range = request.headers.get("range");
  const upstream = await fetch(`${UPSTREAM}?id=${id}&export=download`, {
    headers: range ? { Range: range } : {},
  });

  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "public, max-age=86400");
  return new Response(upstream.body, { status: upstream.status, headers });
}
