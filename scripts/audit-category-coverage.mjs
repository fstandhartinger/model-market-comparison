// Read-only, local evidence only. Optional argument selects an exact retained candidate dataset.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { buildBenchmarkMatrix } from '../lib/benchmark-matrix.mjs';
import { auditCategoryCoverage } from '../lib/category-coverage.mjs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const path = process.argv[2] ?? new URL('../data/dataset.json', import.meta.url);
const bytes = readFileSync(path);
const dataset = JSON.parse(bytes);
const anchors = read('../data/category-score-anchors.json');
const matrix = buildBenchmarkMatrix(buildBenchmarkView(dataset), dataset,
  read('../data/benchmark-taxonomy.json'), read('../data/benchmark-caveats.json'));
const report = auditCategoryCoverage(matrix, dataset, anchors);
console.log(JSON.stringify({ dataset_sha256: createHash('sha256').update(bytes).digest('hex'),
  generated_at: dataset.generated_at, models: dataset.models.length, ...report }, null, 2));
if (report.offered_failures.length) process.exitCode = 1;
