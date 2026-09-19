import { readJevbenchV11 } from "../../../../lib/jevbench-v11.mjs";

// CR-86: the committed JevBench v1.1 artifact, byte for byte (= results/v1.1/ at tag v1.1 of the public repo).
export const dynamic = "force-static";

export async function GET() {
  const { bytes, sha256 } = await readJevbenchV11();
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-SHA256": sha256, "Cache-Control": "public, max-age=3600" },
  });
}
