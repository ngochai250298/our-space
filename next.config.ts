import path from "path";
import type { NextConfig } from "next";

/**
 * Deployed on Cloudflare Workers via the OpenNext adapter
 * (`npx opennextjs-cloudflare build`, config in wrangler.jsonc).
 * The /gdrive/* music proxies are normal Next route handlers and run
 * both in `npm run dev` and on Cloudflare — no extra setup.
 */
const nextConfig: NextConfig = {
  // There is a stray package-lock.json higher up (Desktop); pin the root
  // so Next doesn't guess the wrong workspace directory.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  // Keep gallery/diary photos as plain <img> — no image optimizer needed.
  images: { unoptimized: true },
  // Hide the floating "N" dev-tools button (dev mode only anyway).
  devIndicators: false,
};

export default nextConfig;

// Lets `npm run dev` emulate the Cloudflare bindings (added by the adapter).
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
