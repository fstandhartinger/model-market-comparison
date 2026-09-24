import { readJevbenchV11 } from "../../../../lib/jevbench-v11.mjs";

// CR-139: corrected API projection; source artifact stays byte-for-byte pinned and its hash is reported separately.
export const dynamic = "force-static";

export async function GET() {
  const { bytes, sha256, sourceSha256 } = await readJevbenchV11();
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-SHA256": sha256, "X-Source-SHA256": sourceSha256, "Cache-Control": "public, max-age=3600" },
  });
}
