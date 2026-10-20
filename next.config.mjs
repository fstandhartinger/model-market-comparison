import { JEV_SYSTEM_SLUG_REDIRECTS } from './lib/jev-system-slug.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives inside a monorepo with sibling lockfiles; pin the tracing root.
  outputFileTracingRoot: import.meta.dirname,
  // CR-518: the JevBench board pages are heavy; on the shared 12-core build host under load (~40) the default worker
  // count made /jev-models/api, /all and release pages pass even 180 s per page (20 Oct 2026). Fewer build workers
  // (NEXT_BUILD_CPUS overrides) give each page more CPU; the API board needed ~160 s in a warm dev render, so 900 s per page.
  staticPageGenerationTimeout: 900,
  experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) || 4 },
  // Bundle the committed dataset.json as a runtime fallback when no DB is set.
  outputFileTracingIncludes: {
    "/**": ["./data/dataset.json"],
  },
  // CR-56.3: WebMCP tools may register only in this site's own top-level pages and same-origin frames
  // (a cross-origin frame never gets them; unknown to browsers without WebMCP).
  // CR-170: renamed JevBench system pages keep their old URL as a permanent redirect.
  // The /image-jev-bench/v0.1.4 archive URL existed only during the 29-30 Sep v0.2 page (rolled back).
  // CR-439: /submit is the single submission flow; the old priority-request form redirects there (query string kept).
  // The /success and /cancel pages stay for Stripe sessions created before the merge.
  async redirects() {
    return [...JEV_SYSTEM_SLUG_REDIRECTS, { source: "/jev-models/request-evaluation", destination: "/submit", permanent: true }, { source: "/image-jev-bench/v0.1.4", destination: "/image-jev-bench", permanent: false },
      // CR-519 (v1.6.35): Seb-9B's 7 Oct v1.6.1 row is superseded by its re-measurement; its model URL points to that release.
      { source: "/jev-models/seb-9b", destination: "/jev-models/v1.6.35", permanent: false }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: [{ key: "Permissions-Policy", value: "tools=(self)" }] },
      // Unlisted work-in-progress previews (e.g. the unpublished JevBench v1.5 page): never indexed.
      { source: "/wip-oiifi41ouv1f/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      // Unlisted AudioJevBench WIP preview: never indexed, even if a link leaks.
      { source: "/wip-33gyqg9xwm5y/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
    ];
  },
};

export default nextConfig;
