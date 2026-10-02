// Server-side only. Client components receive the serializable category view;
// their imports of its types must remain type-only.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { IMAGEJEV_CATEGORY_BUNDLES } from './imagejev-category-bundles.mjs';
import { readMultimodalPreviewV02 } from './jevbench-multimodal-preview.mjs';
import { imageJevV02CategoryView } from './imagejev-v02-categories.mjs';

const fail = (why) => { throw new Error(`ImageJevBench v0.2 category bundle: ${why}`); };
function requireTrustPins(expectedHashes) {
  for (const name of ['artifactSha256', 'acceptanceSha256']) {
    if (typeof expectedHashes?.[name] !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHashes[name])) {
      fail(`independently approved ${name} is unconfigured`);
    }
  }
}
function checkBytes(bytes, expected, name) {
  if (!(bytes instanceof Uint8Array)) fail(`${name} must be exact bytes`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== expected) fail(`${name} bytes differ from the trusted SHA256`);
  return sha256;
}

/** Low-level adapter for explicit fixture bytes and EXPECTED hashes in tests.
 * Both independent byte pins are checked before either JSON document is parsed.
 * This cannot configure or override the public release loader's trust registry.
 */
export function parseImageJevV02CategoryBundleBytes(artifactBytes, acceptanceBytes, expectedHashes, expectedRelease, keys) {
  requireTrustPins(expectedHashes);
  const artifactSha256 = checkBytes(artifactBytes, expectedHashes.artifactSha256, 'artifact');
  checkBytes(acceptanceBytes, expectedHashes.acceptanceSha256, 'acceptance');
  return imageJevV02CategoryView(JSON.parse(Buffer.from(artifactBytes).toString('utf8')), expectedRelease, keys,
    JSON.parse(Buffer.from(acceptanceBytes).toString('utf8')), artifactSha256);
}

/** Explicit low-level read adapter: no defaults, fallback or implicit self-trust.
 * Review/model/source authenticity is an external prerequisite to expected pins.
 */
export async function loadImageJevV02CategoryBundle(keys, { recipe, expectedRelease, readBytes }) {
  requireTrustPins(recipe);
  const [artifactBytes, acceptanceBytes] = await Promise.all([
    readBytes(recipe.artifactPath), readBytes(recipe.acceptancePath),
  ]);
  return parseImageJevV02CategoryBundleBytes(artifactBytes, acceptanceBytes, recipe, expectedRelease, keys);
}

/** Public release gate: no fixture or hash overrides. Missing files/pins, altered
 * bytes or wrong release bindings throw; v0.1.5 and null never substitute.
 */
export async function readImageJevV02CategoryView(keys) {
  const recipe = IMAGEJEV_CATEGORY_BUNDLES['v0.2.0'];
  requireTrustPins(recipe);
  const expectedRelease = await readMultimodalPreviewV02();
  return loadImageJevV02CategoryBundle(keys, { recipe, expectedRelease,
    readBytes: (file) => readFile(path.join(process.cwd(), file)) });
}
