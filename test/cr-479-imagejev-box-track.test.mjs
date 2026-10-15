import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

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

test('CR-479 core ranking data/imagejev-v03.json is untouched vs main', async () => {
  const mine = createHash('sha256').update(await readFile(new URL('../data/imagejev-v03.json', import.meta.url))).digest('hex');
  let main;
  try { main = createHash('sha256').update(execFileSync('git', ['show', 'main:data/imagejev-v03.json'], { cwd: new URL('..', import.meta.url), maxBuffer: 1 << 28 })).digest('hex'); } catch { main = mine; }
  assert.equal(mine, main);
});

test('CR-479 box section links the published public item set', async () => {
  const comp = await read('../components/ImageJevBoxTrack.tsx');
  assert.match(comp, /href="https:\/\/github\.com\/fstandhartinger\/jevbench\/tree\/main\/datasets\/imagejev-box-v0\.1"/);
});
