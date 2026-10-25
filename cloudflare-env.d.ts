/// <reference types="@cloudflare/workers-types/2023-07-01" />

// Bindings available to route handlers via getCloudflareContext().env.
// Regenerate with `npm run cf-typegen` after changing wrangler.jsonc.
interface CloudflareEnv {
	ASSETS: Fetcher;
	DB: D1Database;
	PHOTOS_BUCKET: R2Bucket;
	IMAGES: ImagesBinding;
	WORKER_SELF_REFERENCE: Service;
}
