// Fable pass 42 (2026-09-28) source pins — the public JevBench hub after the v1.5.0 release (CR-203/CR-205):
// F-221 the hero's hash is a prefix with the full value in the title; F-222 the live hub's hero names the benchmark, not the
// release, and its release notes are not the intro; F-226 the artifact's "unclassified" value prints as a word.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const release = read('../components/JevBenchV15ReleasePage.tsx');
const preview = read('../components/JevBenchV15Preview.tsx');
const livePage = read('../app/jev-models/page.tsx');
const pinnedPage = read('../app/jev-models/v1.5.0/page.tsx');
const types = read('../components/jevTypes.ts');

test('F-221: the release header prints the data hash through Sha (12-char prefix, full value in the title), never break-all', () => {
  assert.match(preview, /export const Sha = \(\{ v, id \}/, 'Sha is shared with the release header');
  assert.match(release, /import \{ JevBenchV15, Sha \} from '\.\/JevBenchV15Preview'/);
  assert.match(release, /sha256 <Sha v=\{sha256\} \/>/);
  assert.doesNotMatch(release, /break-all/, 'no full 64-hex value is printed in the header');
  assert.doesNotMatch(release, /\{sha256\}<\/code>/);
});

test('F-222: the live hub says what JevBench is first; the release facts sit on the small meta line; the release notes are not the hero', () => {
  assert.match(release, /live = false \}/, 'the component takes a live flag');
  assert.match(livePage, /readCurrentJevbench\(\)/, '/jev-models reads the explicit current release');
  assert.match(livePage, /<JevBenchV16ReleaseRoute live release=\{release\} versionPath=\{CURRENT_JEVBENCH_PAGE\} scope="open" \/>/, '/jev-models renders the current v1.6 board through the pointer');
  assert.doesNotMatch(livePage, /JevBenchV15ReleasePage/);
  assert.doesNotMatch(pinnedPage, /live \/>/, 'the pinned v1.5.0 page is not the live board');
  assert.match(release, /\{live \? 'JevBench by Benchmark Heaven' : `JevBench \$\{artifact\.revision\} — Jev alternatives ranking`\}/, 'the live h1 is the product name; the pinned h1 keeps the release name');
  assert.match(release, /data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark<\/b> for Jev-class decision models: state and a bounded rubric in, a typed answer out\.<\/p>/);
  assert.match(release, /our own benchmark<\/span>/, 'the live eyebrow matches the v1.4.2.2 hub');
  for (const notes of ['doubles the sample', 'option B remains a secondary view', 'scores Choice, Noul and Score requests natively']) {
    assert.ok(!release.includes(notes), `release notes ("${notes}") belong to Method notes, not the hero`);
  }
  assert.match(release, /data-bh-jev-meta>\s*\{live \? `Release \$\{artifact\.revision\}` : 'Frozen release'\} · \{artifact\.sample\.total/, 'the meta line carries the sample and roster facts');
  assert.match(release, /\{!live && <span className="bh-muted"> · <a className="text-accent underline" href="\/jev-models" data-bh-jev-live-link>View live board<\/a><\/span>\}/, 'the live board does not link to itself');
  // The section order CR-205 pins is untouched: the header still carries every marker its test asks for.
  for (const marker of ['data-bh-jev15-release-header', 'data-bh-image-jev-link', 'data-bh-jev-version-share', 'data-bh-jev-meta']) {
    assert.ok(release.includes(marker), `header keeps ${marker}`);
  }
  assert.match(release, /api\/jevbench\/\$\{artifact\.revision\}/, 'the page links to the matching release API route');
});

test('F-226: the artifact value "unclassified" has a label; system-one-open stays the data owner\'s to name (F-192)', () => {
  assert.match(types, /\n  unclassified: "Unclassified",\n\};/);
  const labels = types.slice(types.indexOf('export const JEV_TYPE_LABEL'), types.indexOf('};', types.indexOf('export const JEV_TYPE_LABEL')));
  assert.doesNotMatch(labels, /system-one-open/, 'F-192: no label is invented for system-one-open');
});
