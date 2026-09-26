import { JEV_SYSTEM_SLUG_REDIRECTS } from './lib/jev-system-slug.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives inside a monorepo with sibling lockfiles; pin the tracing root.
  outputFileTracingRoot: import.meta.dirname,
  // Bundle the committed dataset.json as a runtime fallback when no DB is set.
  outputFileTracingIncludes: {
    "/**": ["./data/dataset.json"],
  },
  // CR-56.3: WebMCP tools may register only in this site's own top-level pages and same-origin frames
  // (a cross-origin frame never gets them; unknown to browsers without WebMCP).
  // CR-170: renamed JevBench system pages keep their old URL as a permanent redirect.
  async redirects() {
    return JEV_SYSTEM_SLUG_REDIRECTS;
  },
  async headers() {
    return [
      { source: "/:path*", headers: [{ key: "Permissions-Policy", value: "tools=(self)" }] },
      // Unlisted work-in-progress previews (e.g. the unpublished JevBench v1.5 page): never indexed.
      { source: "/wip-oiifi41ouv1f/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
    ];
  },
};

export default nextConfig;
