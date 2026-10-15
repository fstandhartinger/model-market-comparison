import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const box = JSON.parse(await read('../data/imagejev-box-v01.json'));

test('CR-479 box data: schema, consecutive ranks, baselines never ranked, no excluded keys', () => {
  assert.equal(box.track, 'box');
  assert.ok(box.systems.length > 0);
  for (const s of box.systems) {
    for (const f of ['key', 'name', 'capability', 'box_intelligence', 'ranked']) assert.ok(s[f] !== undefined && s[f] !== null, `${s.key} missing ${f}`);
    if (!s.ranked) assert.ok(s.not_ranked_because, `${s.key} unranked without reason`);
  }
  const ranks = box.systems.filter((s) => s.ranked).map((s) => s.rank).sort((a, b) => a - b);
  assert.deepEqual(ranks, ranks.map((_, i) => i + 1));
  for (const s of box.systems.filter((x) => !x.ranked)) assert.ok(s.rank == null);
  for (const b of box.baselines ?? []) assert.ok(!b.ranked && b.rank == null, `${b.key} must not be ranked`);
  for (const s of [...box.systems, ...(box.baselines ?? [])]) assert.doesNotMatch(s.key, /s1|blink/i);
});

test('CR-479 box section renders after computer-use and before carry; nav link present', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  const cu = page.indexOf('data-bh-v03-computer-use>');
  const bx = page.indexOf('<ImageJevBoxTrack />');
  const carry = page.indexOf('data-bh-v03-carry>');
  assert.ok(cu > 0 && bx > cu && carry > bx);
  assert.match(page, /href="#box-track">Box track</);
  const comp = await read('../components/ImageJevBoxTrack.tsx');
  assert.match(comp, /id="box-track"/);
  assert.match(comp, /data-bh-v03-box-track/);
});

// CR-482: the one-time guard "data/imagejev-v03.json is untouched vs main" was specific to the CR-479 Box-track PR and cannot hold for any later
// core-ranking release; the Box track still reads only data/imagejev-box-v01.json (see the tests above).

test('CR-479 box section links the published public item set', async () => {
  const comp = await read('../components/ImageJevBoxTrack.tsx');
  assert.match(comp, /href="https:\/\/github\.com\/fstandhartinger\/jevbench\/tree\/main\/datasets\/imagejev-box-v0\.1"/);
});
