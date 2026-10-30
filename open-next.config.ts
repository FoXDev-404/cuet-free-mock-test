import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  // P1QA 2026-10-30: serve prerendered page data straight from the bundled
  // static assets. This platform uses no ISR, so every prerendered route can
  // resolve at the asset layer — otherwise each GET re-instantiates the full
  // server bundle (13 MB eval + WASM Prisma) inside the Worker and flaps
  // against the free-plan CPU cap (Cloudflare 1102 / 503 on cold isolates).
  incrementalCache: staticAssetsIncrementalCache,
});
