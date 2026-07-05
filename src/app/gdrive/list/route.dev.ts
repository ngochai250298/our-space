import type { NextRequest } from "next/server";

/**
 * DEV-ONLY folder listing proxy — production twin lives in
 * functions/gdrive/list.js. Returns the public folder's embedded-view HTML;
 * the client parses song ids/titles out of it.
 */
export async function GET(request: NextRequest) {
  const folder = request.nextUrl.searchParams.get("folder") ?? "";
  if (!/^[-\w]{10,}$/.test(folder))
    return new Response("Bad folder", { status: 400 });

  const upstream = await fetch(
    `https://drive.google.com/embeddedfolderview?id=${folder}`
  );
  const html = await upstream.text();
  return new Response(html, {
    status: upstream.status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
