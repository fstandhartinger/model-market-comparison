/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives inside a monorepo with sibling lockfiles; pin the tracing root.
  outputFileTracingRoot: import.meta.dirname,
  // Bundle the committed dataset.json as a runtime fallback when no DB is set.
  outputFileTracingIncludes: {
    "/**": ["./data/dataset.json"],
  },
};

export default nextConfig;
