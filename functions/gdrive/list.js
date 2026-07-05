/**
 * Cloudflare Pages Function: lists a public Drive folder (embedded view HTML).
 * Same contract as the dev proxy in src/app/gdrive/list/route.dev.ts.
 */
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const folder = url.searchParams.get("folder") ?? "";
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
