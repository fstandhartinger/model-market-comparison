// Fable pass 29 (2026-09-21): the surfaces that changed after pass 28 — the /benchmarks matrix's phone chip toggle (CR-63.21) reads
// chips → "less" once opened (F-155), and a one-benchmark ranking that opens on a few matched rows says how many results the board
// publishes, with the hidden count on the "Include results not matched" checkbox (F-156). Source-level pins, like test/fable-pass28.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const [matrix, ranking] = await Promise.all([read('../components/BenchmarkMatrix.tsx'), read('../components/BenchmarkRanking.tsx')]);

test('F-155: in RowTags the revealed chips precede the "+N / less" toggle', () => {
  const extras = matrix.indexOf('<span className="bh-matrix-tagcap-extra"');
  const toggle = matrix.indexOf('<button type="button" className="bh-matrix-tagcap"');
  assert.ok(extras > 0 && toggle > 0, 'both elements exist');
  assert.ok(extras < toggle, 'the extras span is rendered before the toggle button');
  assert.match(matrix, /const MATRIX_TAG_CAP = 2;/, 'the phone cap stays two chips (CR-63.21)');
});

test('F-156: a partly matched board states its published-row count and the checkbox carries the hidden count', () => {
  assert.match(ranking, /const matchedRows = allRows\.length - unmatchedCount;/);
  assert.match(ranking, /unmatchedCount > 0 \? `\$\{matchedRows\} of \$\{counted\(allRows\.length, 'published result'\)\} \$\{allRows\.length === 1 \? 'is' : 'are'\} matched to catalog models · unit: \$\{axis\.unit\} · \$\{direction\}` : `\$\{matched\} of \$\{view\.models\.length\} catalog configurations have a result · unit: \$\{axis\.unit\} · \$\{direction\}`/);
  assert.match(ranking, /Include results not matched to a catalog model \(\{unmatchedCount\}\)<\/label>/);
  // the label keeps its prefix so verify-iter155/156's getByLabel(...) substring match still finds it
  assert.match(ranking, /Include results not matched to a catalog model/);
});
