import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// CR-63.22 (iteration 153): one glyph per meaning — "→" navigates within the site, "↗" opens outside the
// current page flow (another site, or raw data in a new tab). An internal link ending in "↗" without
// target="_blank" promises a new tab or a foreign site it never opens.
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
    for (const m of source.matchAll(/<(Link|a)\b([^>]*)>([^<]*)<\/(?:Link|a)>/g)) {
      const [, tag, attrs, text] = m;
      const internal = tag === 'Link' || /href=(?:"|\{`|\{')\//.test(attrs);
      if (internal && text.includes('↗') && !/target="_blank"/.test(attrs)) offenders.push(`${file}: ${text.trim()}`);
    }
  }
  assert.deepEqual(offenders, []);
});
