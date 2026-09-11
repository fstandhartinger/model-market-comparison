import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Benchmark Heaven", short_name: "Benchmark Heaven",
    description: "Model benchmarks, provider prices and transparent adjusted task costs.",
    start_url: "/", display: "browser", background_color: "#0e131b", theme_color: "#0e131b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
