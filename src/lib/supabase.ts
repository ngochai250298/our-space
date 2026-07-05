import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "@/types";
import { loadItem, saveItem, removeItem } from "@/lib/storage";
import { SYNC_CONFIG } from "@/config";

/**
 * Realtime backend for live location sync between the two devices.
 *
 * The config is resolved in this order:
 *   1. src/config.ts (SYNC_CONFIG) — paste the values into the file
 *   2. build-time env vars NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY
 *   3. Settings → "Đồng bộ vị trí" in the app (stored in localStorage)
 * Without any config the app still works fully on-device; the partner
 * marker is then clearly marked "gần đúng".
 */
const CONFIG_KEY = "supabase";

export function getSupabaseConfig(): SupabaseConfig | null {
  if (SYNC_CONFIG.url && SYNC_CONFIG.anonKey) return SYNC_CONFIG;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) return { url, anonKey };
  const stored = loadItem<SupabaseConfig | null>(CONFIG_KEY, null);
  return stored?.url && stored?.anonKey ? stored : null;
}

export function setSupabaseConfig(config: SupabaseConfig | null): void {
  if (config?.url && config.anonKey) saveItem(CONFIG_KEY, config);
  else removeItem(CONFIG_KEY);
  // Force the client to be rebuilt with the new config.
  client = null;
  clientKey = "";
}

let client: SupabaseClient | null = null;
let clientKey = "";

export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  const key = `${config.url}|${config.anonKey}`;
  if (!client || clientKey !== key) {
    client = createClient(config.url, config.anonKey);
    clientKey = key;
  }
  return client;
}

/** Quick health check used by the Settings screen. Returns an error message or null. */
export async function testSupabaseConnection(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "Chưa có cấu hình.";
  try {
    const { error } = await sb.from("locations").select("role").limit(1);
    if (error) return `Kết nối được nhưng bảng "locations" chưa sẵn sàng: ${error.message}`;
    return null;
  } catch {
    return "Không kết nối được — kiểm tra lại URL và key nhé.";
  }
}
