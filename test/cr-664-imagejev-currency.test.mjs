import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const text = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const a = read('../data/imagejev-v03.json');
const c = read('../data/imagejev-currency-20261102.json');
const page = text('../components/ImageJevV03Page.tsx');
const section = text('../components/ImageJevCurrencyCheck.tsx');

test('CR-664: every currency row points at a live v0.3 row and has a dated vendor source', () => {
  const keys = new Set(a.ranking.map(r => r.key));
  for (const e of [...c.api, ...c.open_weights]) {
    assert.ok(keys.has(e.key), e.key);
    assert.ok(e.measured && e.vendor_now && e.status_label, e.key);
    assert.ok(e.evidence.length >= 1 && e.evidence.every(([href]) => /^https:\/\//.test(href)), e.key);
  }
  assert.match(c.checked_utc, /^2026-11-02T/);
});

test('CR-664: the newer-version rows promise no landing date and claim no measurement', () => {
  const newer = c.api.filter(e => e.status === 'newer-version');
  assert.ok(newer.some(e => e.key === 'sage_1_4_images'));
  assert.match(c.queue_note, /there is no date/);
  const all = JSON.stringify(c);
  assert.doesNotMatch(all, /\b(will land|lands on|ETA|top 5|top five|rank #)/i);
});

test('CR-664: metadata only - no score, rank or ranking membership changed', () => {
  assert.equal(a.revision, 'v0.3.0');
  assert.equal(a.ranking.length, 67);
  assert.equal(a.ranking.find(r => r.key === 'sage_1_4_images').rank, 7);
});

test('CR-664: Jev 1.13.0 rows are named by version, not by the moving alias', () => {
  const r13 = a.ranking.find(r => r.key === 'jev_1_13_images');
  const r14 = a.ranking.find(r => r.key === 'jev_1_14_images');
  assert.doesNotMatch(r13.measurement_source, /\(TypeSafe's stable release, alias jev-latest\)/);
  assert.match(r13.measurement_source, /points to Jev 1\.14\.0 as checked on 2 Nov 2026/);
  assert.match(r14.measurement_source, /jev-preview and jev-latest both point to it/);
  assert.match(page, /moving alias jev-latest now points to Jev 1\.14\.0/);
});

test('CR-664: page renders the section and records it in the revision history', () => {
  assert.match(page, /<ImageJevCurrencyCheck \/>/);
  assert.match(page, /2 Nov 2026 addendum, currency check \(metadata only\)/);
  assert.match(section, /data-bh-imagejev-currency/);
  assert.match(section, /id="currency-check"/);
});

test('CR-664: the only change to existing rows is the alias wording in two Jev measurement_source strings', () => {
  const revert = {
    jev_1_13_images: [/Jev 1\.13\.0 \(TypeSafe's stable release when measured;[^)]*\) with images\./, "Jev 1.13.0 (TypeSafe's stable release, alias jev-latest) with images."],
    jev_1_14_images: [/Jev 1\.14\.0 \(TypeSafe's newest release, available since 14 Oct 2026; the aliases[^)]*\) with images\./, "Jev 1.14.0 (TypeSafe's newest release, available since 14 Oct 2026, alias jev-preview) with images."],
  };
  const rows = JSON.parse(JSON.stringify(a.ranking)).filter(r => r.key !== 'h2o_lightning_4b_v141_d7f1_image');
  for (const [k, [re, orig]] of Object.entries(revert)) {
    const r = rows.find(x => x.key === k);
    assert.match(r.measurement_source, re);
    r.measurement_source = r.measurement_source.replace(re, orig);
  }
  const hash = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  assert.equal(hash, '5c5c616d61af4c9028be0126e567fe24a146564608b2a1002b1b93925b41b249');
});
