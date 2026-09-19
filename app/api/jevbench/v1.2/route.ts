import { readJevbenchV12 } from "../../../../lib/jevbench-v12.mjs";

// CR-92: the committed JevBench v1.2 artifact, byte for byte (= results/v1.2/ at tag v1.2 of the public repo).
export const dynamic = "force-static";

export async function GET() {
  const { bytes, sha256 } = await readJevbenchV12();
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-SHA256": sha256, "Cache-Control": "public, max-age=3600" },
  });
}
