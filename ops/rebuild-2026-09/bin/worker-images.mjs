import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// Local screenshots only: no remote fetch and no implicit image-capable model fallback.
export async function imageEvidence(paths, model) {
  if (!paths.length) return { parts: [], manifest: [] };
  if (!model?.architecture?.input_modalities?.includes('image')) throw new Error('Selected critic does not advertise image input');
  if (paths.length > 8) throw new Error('At most eight screenshot images per review');
  const parts = [], manifest = []; let total = 0;
  for (const path of paths) {
    const info = await stat(path);
    if (!info.isFile() || info.size > 4_000_000 || info.size + total > 16_000_000) throw new Error('Screenshot evidence size limit exceeded');
    const bytes = await readFile(path); total += bytes.length;
    if (!bytes.length || bytes.length > 4_000_000 || total > 16_000_000) throw new Error('Screenshot evidence size limit exceeded');
    const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : null;
    if (!mime) throw new Error('Screenshot must be PNG or JPEG');
    manifest.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), mime });
    parts.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${bytes.toString('base64')}` } });
  }
  return { parts, manifest };
}
