import path from "path";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

/**
 * Two build shapes:
 * - `npm run dev`: also registers *.dev.ts route handlers — local proxies for
 *   Google Drive music (src/app/gdrive/...). Static export forbids route
 *   handlers, so they only exist in dev.
 * - `npm run build`: static export to out/ for Cloudflare Pages. The Drive
 *   proxies are provided there by Pages Functions (functions/gdrive/...).
 */
const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // There is a stray package-lock.json higher up (Desktop); pin the root
    // so Next/Turbopack doesn't guess the wrong workspace directory.
    turbopack: { root: path.join(__dirname) },
    // Static export has no image optimizer server; photos are remote URLs anyway.
    images: { unoptimized: true },
    // Hide the floating "N" dev-tools button (dev mode only anyway).
    devIndicators: false,
    ...(isDev
      ? { pageExtensions: ["dev.ts", "tsx", "ts", "jsx", "js"] }
      : { output: "export" as const }),
  };
};

export default nextConfig;
