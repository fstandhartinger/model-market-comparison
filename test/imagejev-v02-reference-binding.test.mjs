import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  multimodalPreviewV02VisibleKeys,
  readMultimodalPreview,
  validateMultimodalPreviewV02HistoricalAdditionReceipt,
  validateMultimodalPreviewV02ReferenceBindings,
} from '../lib/jevbench-multimodal-preview.mjs';

const HISTORICAL_KEY = 'imajev_4b_20260926';

test('v0.2 references must be exact rows from the pinned v0.1.4 roster', async () => {
  const prior = await readMultimodalPreview();
  assert.equal(prior.revision, 'v0.1.4');
  assert.equal(prior.ranking.length, 50, 'the existing v0.1.4 roster remains complete');
  const row = prior.ranking.find((candidate) => candidate.key === 'wity_1');
  assert.ok(row, 'fixture uses an actual pinned v0.1.4 system');
  const exact = {
    key: row.key,
    name: row.name,
    kind: row.kind ?? (row.api_flag ? 'api' : 'gpu'),
    reference_revision: 'v0.1.4',
    reference_score: row.score,
    reason: 'Synthetic binding fixture',
  };
  assert.equal(validateMultimodalPreviewV02ReferenceBindings([exact], prior.ranking), true);

  for (const [field, value] of [['reference_score', row.score + 1], ['name', 'Forged system name'], ['kind', row.kind === 'api' ? 'gpu' : 'api']]) {
    const forged = { ...exact, [field]: value };
    assert.throws(() => validateMultimodalPreviewV02ReferenceBindings([forged], prior.ranking),
      /does not match pinned v0\.1\.4 values/,
      `a forged ${field} must not pass the reader binding`);
  }

  const standaloneHistoricalReference = {
    ...exact, key: HISTORICAL_KEY, name: 'Imajev-4B historical snapshot', reference_score: 70,
  };
  assert.throws(() => validateMultimodalPreviewV02ReferenceBindings([standaloneHistoricalReference], prior.ranking),
    /not in the v0\.1\.4 roster/);
});

test('the historical addition needs a measured or measured-unrankable receipt', () => {
  for (const status of ['measured', 'measured-unrankable']) {
    assert.equal(validateMultimodalPreviewV02HistoricalAdditionReceipt('preview', {
      'Configuration receipts': [{ key: HISTORICAL_KEY, status }],
    }), true);
  }
  for (const receipts of [undefined, [], [{ key: HISTORICAL_KEY, status: 'reference-only' }],
    [{ key: HISTORICAL_KEY, status: 'measured' }, { key: HISTORICAL_KEY, status: 'measured-unrankable' }]]) {
    assert.throws(() => validateMultimodalPreviewV02HistoricalAdditionReceipt('preview', {
      'Configuration receipts': receipts,
    }), /needs a measured configuration receipt/);
  }
  assert.equal(validateMultimodalPreviewV02HistoricalAdditionReceipt('measurements-in-progress', {}), true);
});

test('visible configuration count includes the fresh unrankable historical addition and page has no fake reference cell', async () => {
  const prior = await readMultimodalPreview();
  const artifact = {
    ranking: [],
    reference_rows: prior.ranking.map(({ key }) => ({ key })),
    measured_unrankable_rows: [{ key: HISTORICAL_KEY }],
  };
  assert.equal(multimodalPreviewV02VisibleKeys(artifact).size, 51);

  const page = await readFile(new URL('../app/jev-models/multimodal-preview/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Available v0\.1\.4 scores are labeled as references; historical additions without a v0\.1\.4 row are identified separately\./);
  const referenceCell = page.match(/<td className="p-3 text-right tabular-nums">\{reference([\s\S]*?)<\/td>/);
  assert.ok(referenceCell, 'the unrankable row has a dedicated conditional reference cell');
  assert.match(referenceCell[1], /^\s*\?\s*<>[\s\S]*REFERENCE v0\.1\.4[\s\S]*?:\s*<span>No v0\.1\.4 score \(historical addition\)<\/span>\}/);
  assert.doesNotMatch(referenceCell[1], /Number\(reference\?\.reference_score\)/);
  assert.match(page, /multimodalPreviewV02VisibleKeys\(artifact\)/,
    'the page count uses the shared ranked/reference/unrankable key union');
});
