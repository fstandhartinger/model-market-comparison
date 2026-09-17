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
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Permissions-Policy", value: "tools=(self)" }] }];
  },
};

export default nextConfig;
