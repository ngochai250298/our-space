"use client";

import { ADMIN_PASSWORD } from "@/config";
import { getSupabase } from "@/lib/supabase";

const TABLE = "app_config";
const ROW_ID = 1;

/**
 * The /admin gate password. It lives on Supabase so it can be changed from
 * inside the app instead of editing config.ts and redeploying; ADMIN_PASSWORD
 * stays as the seed/fallback for when the cloud (or migration9) isn't there.
 *
 * ⚠️ Still a browser-side gate, not real security: the anon key can read this
 * table. Cloudflare Access on /admin is the real answer.
 */
export async function currentAdminPassword(): Promise<string> {
  const sb = getSupabase();
  if (!sb) return ADMIN_PASSWORD;
  const { data, error } = await sb
    .from(TABLE)
    .select("admin_password")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error || !data) return ADMIN_PASSWORD;
  return String((data as { admin_password: string }).admin_password);
}

export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Chưa cấu hình Supabase." };

  const current = await currentAdminPassword();
  if (oldPassword !== current)
    return { ok: false, error: "Mật khẩu hiện tại không đúng." };
  const next = newPassword.trim();
  if (next.length < 4)
    return { ok: false, error: "Mật khẩu mới phải từ 4 ký tự trở lên." };
  if (next === current)
    return { ok: false, error: "Mật khẩu mới trùng mật khẩu cũ." };

  const { error } = await sb.from(TABLE).upsert({
    id: ROW_ID,
    admin_password: next,
    updated_at: new Date().toISOString(),
  });
  if (error)
    return {
      ok: false,
      error: `Không lưu được — đã chạy migration9_friends.sql chưa? (${error.message})`,
    };
  return { ok: true };
}
