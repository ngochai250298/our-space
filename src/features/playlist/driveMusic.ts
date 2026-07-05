"use client";

import { loadItem, saveItem } from "@/lib/storage";
import { MUSIC_FOLDER_ID } from "@/config";

/**
 * Playlist source: a public Google Drive folder. The folder's embedded view
 * lists every file; we parse the audio ones out. Newly uploaded songs appear
 * automatically on the next visit — no code change needed.
 */
export interface DriveSong {
  id: string;
  title: string;
}

const CACHE_KEY = "music";
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac|flac)\s*$/i;

/**
 * Streams through the app's own /gdrive proxy (dev: Next route handler,
 * production: Cloudflare Pages Function). Google blocks direct <audio>
 * hotlinks to Drive, but the proxy passes Range through so seeking works.
 */
export function streamUrl(id: string): string {
  return `/gdrive/stream/${id}`;
}

// Last-resort list (the folder's content at build time) so the playlist
// still works on the very first load if Drive can't be reached.
const SEED: DriveSong[] = [
  { id: "1ssoWgmanT4CuYI3mU4l-EY8T5PYdlrSo", title: "(S)TRONG Trọng Hiếu x Rhymastic - Kho Báu" },
  { id: "1tTTK9rRW5pONs_I5gGuKtYpmCe_naZeV", title: "Em - Binz - Binz Da Poet" },
  { id: "1475_2lHdo019bXSsiWwsczNhNHfTNNYm", title: "Kara Lyrics Bạn Đời - Karik (feat. GDUCKY)" },
];

function parseFolder(html: string): DriveSong[] {
  const songs: DriveSong[] = [];
  const entry = /id="entry-([-\w]{20,})"[\s\S]*?flip-entry-title">([^<]+)</g;
  let match;
  while ((match = entry.exec(html))) {
    const [, id, rawName] = match;
    if (!AUDIO_EXT.test(rawName)) continue;
    songs.push({
      id,
      title: rawName.replace(AUDIO_EXT, "").replace(/\s+/g, " ").trim(),
    });
  }
  return songs;
}

export function cachedSongs(): DriveSong[] {
  const cached = loadItem<DriveSong[]>(CACHE_KEY, []);
  return cached.length ? cached : SEED;
}

export async function fetchSongs(): Promise<DriveSong[]> {
  let html = "";
  // Own proxy first (dev route handler / Cloudflare Pages Function)...
  try {
    html = await (await fetch(`/gdrive/list?folder=${MUSIC_FOLDER_ID}`)).text();
  } catch {
    // ignore — proxied attempt below
  }
  // ...then a public CORS proxy as backup, e.g. when previewing the static
  // build locally where no function is running.
  if (!html.includes("flip-entry")) {
    try {
      const target = `https://drive.google.com/embeddedfolderview?id=${MUSIC_FOLDER_ID}`;
      html = await (
        await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`)
      ).text();
    } catch {
      // ignore — cache/seed fallback below
    }
  }
  const songs = parseFolder(html);
  if (songs.length) {
    saveItem(CACHE_KEY, songs);
    return songs;
  }
  return cachedSongs();
}
