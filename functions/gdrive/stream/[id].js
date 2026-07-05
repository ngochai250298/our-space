/**
 * Cloudflare Pages Function: streams a Google Drive audio file to the app.
 * Same contract as the dev proxy in src/app/gdrive/stream/[id]/route.dev.ts.
 * Deployed automatically with the site — no extra setup on Cloudflare.
 */
export async function onRequestGet(context) {
  const { id } = context.params;
  if (!/^[-\w]{10,}$/.test(id)) return new Response("Bad id", { status: 400 });

  const range = context.request.headers.get("Range");
  const upstream = await fetch(
    `https://drive.usercontent.google.com/download?id=${id}&export=download`,
    { headers: range ? { Range: range } : {} }
  );

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
