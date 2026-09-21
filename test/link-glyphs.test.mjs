import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// CR-63.22 (iteration 153): one glyph per meaning — "→" for a link that stays on the site, "↗" for
// one that leaves it. An internal <Link> ending in "↗" promises a new tab or a foreign site it never opens.
function tsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tsxFiles(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

test('internal links never carry the external-link glyph', () => {
  const offenders = [];
  for (const file of [...tsxFiles('components'), ...tsxFiles('app')]) {
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/<Link\b[^>]*>([^<]*)<\/Link>/g)) if (m[1].includes('↗')) offenders.push(`${file}: ${m[1].trim()}`);
  }
  assert.deepEqual(offenders, []);
});
