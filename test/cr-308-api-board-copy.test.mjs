import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const board = src('components/JevBenchV16Board.tsx');
const shared = src('components/JevBoardShared.tsx');

test('N5: the preliminary bullet and roster intro are conditional; no dead link when nothing is preliminary', () => {
  assert.match(board, /\{preliminary \? <li>API offerings that are not yet re-measured/);
  assert.match(board, /No preliminary public-set rows remain/);
  assert.match(board, /carry\.rows\.length > 0 \? <>APIs not yet re-measured keep their dated v1\.5\.x score/);
});

test('N6/N4: A4 exception notes sit next to the frozen "not equated" text and the exposure table is overlaid', () => {
  assert.match(board, /data-bh-jev16-a4-exception/);
  assert.match(board, /data-bh-jev16-a4-set-note/);
  assert.match(board, /data-bh-jev16-overnight-a4-exception/);
  assert.match(board, /A4 \(retired after this run\)/);
  assert.match(board, /measured 6 Oct 2026 on A4 ∪ P \(v1\.7\.7\)/);
});

test('N7/F17/N8/N9: roster basis line, est. pill, wrapper group, Capability from axes', () => {
  assert.match(board, /A4 ∪ P \(\$\{s\.a4\.n_items\} items, equated\)/);
  assert.match(board, /costCell/);
  assert.match(board, /Wrappers that serve Jev \(listed, never ranked, not class-assessed\)/);
  assert.match(board, /\(i \+ c\) \/ 2/);
});

test('N10/F16: history copy', () => {
  assert.match(board, /GPT-6 Luna, Qwen3\.8 27B, GPT-6 Luna low, DeepSeek Flash and GPT-5\.6 Luna have the highest raw Capability/);
  assert.match(board, /“Not ranked, only shown as a reference to compare with” on the open-weights board;/);
});

test('N13: variants keep their full display in the failed-answers and provenance lists', () => {
  assert.match(board, /nameLabel\(s\.display, methodSystems\)/);
});

test('F5: the API pill is a flex-none sibling of the truncated name', () => {
  assert.match(shared, /data-bh-jev-name-row/);
  assert.match(shared, /bh-flag-tag ml-1\.5 shrink-0/);
});

test('N11: a ratio that rounds to the cap prints more decimals', () => {
  const mk = (key, cost, p50) => ({ key, display: key, axes: { intelligence: 80, calibration: 80, speed: 80 }, cost: { usd_per_1000: cost }, speed: { p50_s_adjusted: p50 } });
  const view = jevClassRows([mk('jev-1.13.0', 0.03, 0.6), mk('x', 0.01, 1.212), mk('y', 0.01, 1.4)], { referenceLabel: 'Jev', nearCapPrecision: true });
  const reason = (k) => view.rows.find((r) => r.row.key === k).reasons.join();
  assert.equal(reason('x'), 'latency 2.02× Jev');
  assert.equal(reason('y'), 'latency 2.3× Jev');
  // default output stays identical (frozen classifier hashes)
  const legacy = jevClassRows([mk('jev-1.13.0', 0.03, 0.6), mk('x', 0.01, 1.212)], { referenceLabel: 'Jev' });
  assert.equal(legacy.rows.find((r) => r.row.key === 'x').reasons.join(), 'latency 2.0× Jev');
});
