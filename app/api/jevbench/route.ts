import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JEVBENCH_ARTIFACT, JEVBENCH_SHA256 } from "../../../lib/jevbench.mjs";

// CR-84: the publication-safe JevBench v1 artifact, served byte for byte (aggregates only; lib/jevbench.mjs refuses
// any item-level key). The sha256 header lets anyone check it against the committed file and the harness repository.
export async function GET() {
  const body = await readFile(join(process.cwd(), JEVBENCH_ARTIFACT));
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-SHA256": JEVBENCH_SHA256, "Cache-Control": "public, max-age=3600" } });
}
