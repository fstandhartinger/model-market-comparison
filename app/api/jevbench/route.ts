import { readJevbench } from "../../../lib/jevbench.mjs";

// CR-84: the public JSON is the committed JevBench v1 artifact, byte for byte (aggregates only; lib/jevbench.mjs refuses
// anything item-level). The sha256 header lets anyone check it against the artifact in the public jevbench repository.
export const dynamic = "force-static";

export async function GET() {
  const { bytes, sha256 } = await readJevbench();
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-SHA256": sha256, "Cache-Control": "public, max-age=3600" },
  });
}
