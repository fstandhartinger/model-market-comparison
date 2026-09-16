// CR-62.1 follow-up: the first visitor after a deploy used to wait while the server built the page-data JSON
// (several MB for the Overview and catalog pages). Once the server listens, request each body once so it is
// built and memoised before real traffic. Plain HTTP to our own port: this file is bundled for every runtime,
// so it must not import the data layer.
const KEYS = ["home", "catalog", "benchmarks", "ranking", "compare", "benchmaxxing", "filters"];

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  setTimeout(async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        for (const key of KEYS) { const r = await fetch(`${base}/api/page-data/${key}`); await r.arrayBuffer(); }
        return;
      } catch { await new Promise((resolve) => setTimeout(resolve, 3000)); }
    }
  }, 3000);
}
