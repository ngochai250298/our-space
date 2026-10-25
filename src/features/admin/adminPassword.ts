"use client";

import { ADMIN_PASSWORD } from "@/config";
import { apiGet, apiPut } from "@/lib/api";

const ENDPOINT = "/api/admin-config";

/**
 * The /admin gate password. It lives in the app_config row on the server so it
 * can be changed from inside the app instead of editing config.ts and
 * redeploying; ADMIN_PASSWORD stays as the seed/fallback for when the request
 * fails.
 *
 * ⚠️ Still a browser-side gate, not real security. Cloudflare Access on /admin
 * is the real answer.
 */
export async function currentAdminPassword(): Promise<string> {
  try {
    const { admin_password } = await apiGet<{ admin_password: string }>(ENDPOINT);
    return admin_password || ADMIN_PASSWORD;
  } catch {
    return ADMIN_PASSWORD;
  }
}

export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  // The route checks the old password and the new one's length, so the rules
  // live in one place instead of being re-validated here.
  try {
    await apiPut(ENDPOINT, { oldPassword, newPassword });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không lưu được.",
    };
  }
}
