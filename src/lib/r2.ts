import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Photos and avatars live in the R2 bucket (binding `PHOTOS_BUCKET`).
 * The bucket itself stays private: files are served back through
 * /api/storage/<key>, so nothing needs a public bucket URL.
 */
export function bucket(): R2Bucket {
  return getCloudflareContext().env.PHOTOS_BUCKET;
}

export function storageUrl(key: string): string {
  return `/api/storage/${key}`;
}
