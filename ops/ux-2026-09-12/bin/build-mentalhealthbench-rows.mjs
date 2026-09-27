#!/usr/bin/env node
// CR-190.1 — deterministic, offline extraction of MentalHealthBench's overall board from our own
// retained captures. Pure function of the two files in
// data/raw/benchmarks/daily-evidence/2026-09-27-cr190/: re-running it on the same bytes must produce
// byte-identical rows, so a reviewer can reproduce every number without fetching anything.
//
// Two captures, two jobs:
//   * the paper PDF text layer (primary_url) prints Figure 5(a)'s 17 rows as text — the values;
//   * the announcement page's Vega-Lite payload carries the same board machine-readable, with full
//     precision and 95% confidence intervals, for 15 of those 17 models — the intervals, and a
//     second reading of every value it covers.
// The paper's printed one-decimal number is what we publish (it is the registry's pinned locator and
// the only source that covers all 17); the payload supplies the interval and is checked to round to it.
//
// Nothing here chooses a catalog configuration: the paper states every model ran at its API default
// reasoning effort, and for these families the catalog holds no setting-less configuration, so the
// rows stay unjoined (the D219.1 policy, lib/board-identity.mjs).
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const DIR = 'data/raw/benchmarks/daily-evidence/2026-09-27-cr190';
const BENCHMARK_ID = 'openai-mentalhealthbench::snapshot-2026-09-23';
const PAPER_URL = 'https://cdn.openai.com/ctf-cdn/MentalHealthBench_A_Comprehensive_Benchmark_of_AI_Capabilities_in_Realistic_Mental_Health_Conversations.pdf';
const POST_URL = 'https://openai.com/index/introducing-mentalhealthbench/';
const PUBLISHED_AT = '2026-09-23';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const slug = (label) => label.toLowerCase().replace(/[()]/g, '').trim().replace(/\s+/g, '-');

const manifest = JSON.parse(await readFile(`${DIR}/manifest.json`, 'utf8'));
const receiptFor = (url) => {
  const r = manifest.find((m) => m.url === url && m.status === 200);
  if (!r) throw new Error(`No 200 receipt for ${url}`);
  return r;
};
const textOf = async (receipt) => {
  const body = gunzipSync(await readFile(receipt.file));
  if (sha256(body) !== receipt.sha256) throw new Error(`Capture changed: ${receipt.file}`);
  return body.toString('utf8');
};

const paper = receiptFor(PAPER_URL);
const post = receiptFor(POST_URL);
const paperText = await textOf(paper);
const postText = await textOf(post);

// --- the paper: Figure 5(a), page 11 -----------------------------------------------------------
const start = paperText.indexOf('a) Task-clipped score');
const end = paperText.indexOf('Task-clipped score (%)', start);
if (start < 0 || end < 0) throw new Error('Figure 5 block not found in the paper text layer');
const printed = [];
for (const line of paperText.slice(start, end).split('\n')) {
  const m = /^\s*(\S.*?)\s{2,}(\d+\.\d)\s{2,}(−\d+)\s{2,}(\d+)\s*$/.exec(line);
  if (m) printed.push({ label: m[1], value: Number(m[2]), row: line.trim().replace(/\s{2,}/g, '  ') });
}
if (printed.length !== 17) throw new Error(`Expected 17 printed rows in Figure 5(a), read ${printed.length}`);

// --- the announcement: the "mentalhealthbench-overall" Vega-Lite spec ---------------------------
// The payload is JSON escaped inside an RSC flight chunk; unescape the one spec we need and read
// only its data.values. No JavaScript from the page is executed.
const linkAt = postText.indexOf('\\"linkId\\":\\"mentalhealthbench-overall\\"', postText.indexOf('vegaLiteSpec') > 0 ? 0 : 0);
const specAt = postText.indexOf('\\"vegaLiteSpec\\"', linkAt);
if (linkAt < 0 || specAt < 0) throw new Error('Overall chart payload not found in the announcement capture');
const valuesAt = postText.indexOf('\\"values\\":[', specAt);
const valuesEnd = postText.indexOf(']', postText.indexOf('}]', valuesAt)) + 1;
const values = JSON.parse(postText.slice(valuesAt + '\\"values\\":'.length, valuesEnd).replace(/\\"/g, '"'));
const payload = new Map();
for (const v of values) {
  // The chart's own footnote defines the trailing "*" as a display marker ("Newest evaluated model
  // from each provider (as of September 23, 2026)"), not part of the model's name.
  const label = v.label.endsWith('*') ? v.label.slice(0, -1) : v.label;
  if (slug(label) !== v.modelKey) throw new Error(`Payload label/key disagree: ${v.label} vs ${v.modelKey}`);
  payload.set(label, v);
}
if (payload.size !== 15) throw new Error(`Expected 15 payload rows, read ${payload.size}`);

const PROTOCOL_BASE = 'Vendor-reported by OpenAI in its own MentalHealthBench paper (2026-09-23): mean task-clipped rubric score over 1,215 conversations, four independently sampled completions per task, each rubric criterion graded by an LLM judge (GPT-5.6 Sol at high reasoning effort). OpenAI authored the benchmark, ran every model itself and supplies the judge, so no row is an independent measurement; all rows are self_reported and never enter the Composite. The paper states "We use each model’s API at default reasoning effort, temperature, and verbosity setting (when applicable)", so no reasoning-effort configuration is identified and the row is not attached to one.';
const UNJOINED_NOTE = 'Not joined to a catalog configuration: the source states the API default setting rather than a named effort, and the catalog holds no setting-less configuration for this family (the standing policy in lib/board-identity.mjs). Picking one effort would assert a setting the source never states.';

const observations = [];
for (const p of printed) {
  const v = payload.get(p.label);
  if (v && Number(v.value.toFixed(1)) !== p.value) {
    throw new Error(`Paper and payload disagree for ${p.label}: ${p.value} vs ${v.value}`);
  }
  const o = {
    id: `self-reported:${slug(p.label)}-openai-mentalhealthbench`,
    benchmark_id: BENCHMARK_ID,
    subject: { source_id: p.label, name: p.label, model_id: null, variant: null, harness: null },
    value: p.value,
    unit: 'percent',
    basis: 'self_reported',
    ...(v ? { confidence_interval: { level: 0.95, lower: v.ciLow, upper: v.ciHigh } } : {}),
    source: {
      url: PAPER_URL, retrieved_at: paper.retrieved_at, published_at: PUBLISHED_AT,
      sha256: paper.sha256, file: paper.file,
      locator: `Figure 5(a) "Overall model performance", page 11: the printed task-clipped score data label at the end of this model's bar row; printed row (panel a value, then panel b's penalty and positive components): "${p.row}"`,
    },
    ...(v ? { supporting_sources: [{
      url: POST_URL, retrieved_at: post.retrieved_at, published_at: PUBLISHED_AT,
      sha256: post.sha256, file: post.file,
      locator: `Announcement page RSC payload, chart linkId "mentalhealthbench-overall" ("Overall model performance"), vegaLiteSpec.data.values entry modelKey "${v.modelKey}": value ${v.value}, ciLow ${v.ciLow}, ciHigh ${v.ciHigh}. The page's publicationDateText is "September 23, 2026".`,
    }] } : {}),
    protocol: `${PROTOCOL_BASE}${v ? ` The 95% confidence interval is OpenAI's own, read from the announcement page's machine-readable chart payload for modelKey "${v.modelKey}", whose full-precision value ${v.value} rounds to the paper's printed ${p.value}.` : ' The announcement page’s machine-readable overall chart omits this model, so only the paper’s printed value is available and no confidence interval is recorded.'} ${UNJOINED_NOTE}`,
    comparison_key: null,
  };
  observations.push(o);
}
observations.sort((a, b) => a.id.localeCompare(b.id));

const collection = {
  benchmark_id: BENCHMARK_ID, status: 'collected', source_url: PAPER_URL,
  reason: 'OpenAI’s own MentalHealthBench paper captured and retained; the 17 rows of Figure 5(a) are the only values it prints as text for the overall board, and the announcement page’s machine-readable chart payload supplies OpenAI’s own 95% intervals for the 15 models it covers. The values are self-reported, never enter the Composite, and are replaced by independent matching-protocol results when those appear.',
};

const out = process.argv[2] || `${DIR}/overall-rows.json`;
await writeFile(out, `${JSON.stringify({ schema_version: 1, observations, collections: [collection] }, null, 2)}\n`);
console.log(JSON.stringify({ out, observations: observations.length, with_interval: observations.filter((o) => o.confidence_interval).length,
  paper_sha256: paper.sha256, post_sha256: post.sha256 }));
