import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Server-side access to the Cloudflare D1 database (binding `DB` in
 * wrangler.jsonc). Only route handlers touch this — the browser never sees
 * the database, it goes through /api/*.
 */
export function db(): D1Database {
  return getCloudflareContext().env.DB;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
