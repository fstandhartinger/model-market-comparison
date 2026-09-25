// D193.2, 2026-09-25. `scan-protocol-excerpts.mjs` found 16 references in the state D193 repaired:
// the daily protocol guard demands the excerpt verbatim (their extracted text is over the
// 60,000-byte bound) and it is not in the source, so the board fails on any day its rows change.
// Two of those groups are repaired here; the rest are filed in PROGRESS.md because each needs a
// judgement the guard exists to force, not an edit.
//
//   * `lisanbench::0.2.0` quoted `core.json` with a space after every colon. The file is compact JSON
//     with none, so the excerpt was hand-typed and could never match — but the values it names (50
//     starting words, that exact SCOWL dictionary) are current and are real configuration, so the
//     entry now pins them verbatim. `num_models` is deliberately left out of the pin: it rises every
//     time LisanBench adds a model, and a guard that fires on a new model is the bug again.
//     `rankings.json` is 1.39 MB of per-word rows and stop reasons with no prose in it at all, so it
//     becomes a field locator in the `literal field` form `protocol()` excludes from a packet.
//   * The four `matharena-*` competition tables quoted a raw HTML attribute fragment, with plain
//     quotes, against a payload that JSON-escapes its HTML — and the guard compares against the
//     *extracted* text, not the capture. It failed for two mechanical reasons at once. Checked
//     first, because D193.3 showed a broken excerpt can be hiding a real change: it is not. The
//     `Accuracy (± 95% CI)` column and its normal-approximation tooltip are still in all four
//     captures, byte for byte. So these become field locators too, and the column identity stays
//     enforced where it already was — `require_header` in the collection plan.
//
// The captures are the ones the 2026-09-24T19:20Z run took, retained with their receipts at
// data/raw/benchmarks/daily-evidence/2026-09-25-d193-2/. Every mutation below is a failure probe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { protocolSourceContent } from '../ops/daily/refresh-benchmarks.mjs';

const repo = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, repo), 'utf8'));
const registry = read('data/raw/benchmarks/registry.json');
const plan = read('data/raw/benchmarks/collection-plan.json');
const captures = read('data/raw/benchmarks/daily-evidence/2026-09-25-d193-2/manifest.json');

const MATHARENA = ['matharena-apex::2025', 'matharena-apex-shortlist::2025',
  'matharena-hmmt::2025-11', 'matharena-hmmt::2026-02'];
// Six entries shared a second `competitions` reference whose excerpt was also raw HTML. It now
// quotes the page's own text — board name, Deprecated badge and problem count — and stops before the
// model count, which rises whenever MathArena evaluates another model.
const BADGED = [...MATHARENA, 'matharena-aime::2026', 'matharena-usamo::2026'];
const ENTRIES = ['lisanbench::0.2.0', ...MATHARENA];
const ACCURACY_COLUMN = 'Accuracy (± 95% CI)';

const raw = new Map(), bodies = new Map();
for (const c of captures) {
  const bytes = gunzipSync(readFileSync(new URL(c.file, repo)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), c.sha256,
    `retained capture no longer matches its receipt: ${c.url}`);
  raw.set(c.url, bytes.toString('utf8'));
  bodies.set(c.url, execFileSync('python3', ['ops/daily/public-candidate.py', 'text', c.file],
    { cwd: repo, encoding: 'utf8', maxBuffer: 32_000_000 }));
}

const entry = (id) => {
  const e = registry.entries.find((x) => x.id === id);
  assert.ok(e, `${id}: registry entry`);
  return e;
};
const packetReferences = (entry) =>
  (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
const payloadReferences = (entry) =>
  (entry.evidence ?? []).filter((s) => /literal field/.test(s.excerpt ?? '') && bodies.has(s.url));

test('D193.2: every reviewed reference of the five entries resolves and quotes its own source', () => {
  for (const id of ENTRIES) {
    const references = packetReferences(entry(id)).filter((r) => bodies.has(r.url));
    assert.ok(references.length >= 2, `${id}: expected at least two reviewed references in this set`);
    for (const reference of references) {
      const body = bodies.get(reference.url);
      assert.doesNotThrow(() => protocolSourceContent(id, reference, body), `${id}: ${reference.url}`);
      // Forced, so a source growing past the bound cannot reopen this.
      assert.equal(protocolSourceContent(id, { ...reference, review_content: 'excerpt' }, body),
        reference.excerpt, `${id}: ${reference.url} does not quote its own source`);
    }
  }
});

test('D193.2: the LisanBench pin states the configuration and leaves the model count out of it', () => {
  const core = entry('lisanbench::0.2.0').evidence
    .find((s) => s.url === 'https://lisanbench.com/data/core.json');
  const spec = plan.entries.find((e) => e.benchmark_id === 'lisanbench::0.2.0').parser.require;
  assert.match(core.excerpt, /"num_words":50/);
  assert.ok(core.excerpt.includes(`"words_file":"${spec.words_file}"`),
    'the pin names the dictionary the collection plan requires');
  assert.equal(spec.num_words, 50, 'the plan still requires the same 50-word set');
  // The volatile field: pinning it would fail the board every time LisanBench adds a model.
  assert.ok(!core.excerpt.includes('num_models'), 'num_models is deliberately not pinned');
  assert.match(bodies.get('https://lisanbench.com/data/core.json'), /"num_models":\d+/,
    'the capture does carry num_models, so leaving it out is a choice and not an absence');
});

test('D193.2: the MathArena accuracy column really is in all four captures, tooltip and all', () => {
  const header = plan.entries.find((e) => e.benchmark_id === 'matharena-apex::2025').parser.require_header;
  assert.ok(header.includes(ACCURACY_COLUMN), 'the collection plan still requires this exact column');
  for (const id of MATHARENA) {
    const table = payloadReferences(entry(id)).find((s) => s.url.includes('/competition_tables/'));
    assert.ok(table, `${id}: the competition table is a payload reference`);
    assert.ok(table.excerpt.startsWith(`"${ACCURACY_COLUMN}"`), `${id}: the locator names the column`);
    // The payload JSON-escapes its HTML, so this is the form the column really takes in the bytes.
    const body = raw.get(table.url);
    // The payload JSON-escapes non-ASCII too, so ± is the six-character sequence \u00b1 in the bytes.
    assert.ok(body.includes('>Accuracy (\\u00b1 95% CI)</th>'), `${id}: the column header is in the capture`);
    assert.ok(body.includes('together with a 95% confidence interval obtained with the normal approximation.'),
      `${id}: the normal-approximation tooltip is unchanged`);
  }
});

test('D193.2: the value payloads stay out of the review packet and name a real field', () => {
  const rankings = JSON.parse(bodies.get('https://lisanbench.com/data/rankings.json'));
  const lisan = payloadReferences(entry('lisanbench::0.2.0'));
  assert.equal(lisan.length, 1, 'rankings.json is the entry\'s only excluded payload');
  assert.ok(!packetReferences(entry('lisanbench::0.2.0')).includes(lisan[0]));
  assert.ok(Object.hasOwn(rankings, 'per_word'), 'per_word is really a field of the capture');
  assert.ok(Array.isArray(rankings.per_word) && rankings.per_word.length > 1000,
    'and it is the bulk of the payload, which is why it is not read to a reviewer');
  for (const id of MATHARENA) {
    for (const p of payloadReferences(entry(id))) {
      assert.ok(!packetReferences(entry(id)).includes(p), `${id}: ${p.url} is not reviewed`);
    }
  }
});

test('D193.2: each Deprecated badge pin quotes the page and agrees with the plan\'s problem count', () => {
  const comps = 'https://matharena.ai/competitions';
  const text = bodies.get(comps).replace(/\s+/g, ' ');
  for (const id of BADGED) {
    const ref = entry(id).evidence.find((s) => s.url === comps && /Deprecated/.test(s.excerpt));
    assert.ok(ref, `${id}: a Deprecated badge reference`);
    const problems = plan.entries.find((e) => e.benchmark_id === id).parser.require_problems;
    assert.match(ref.excerpt, new RegExp(`Deprecated ${problems} problems`),
      `${id}: the pin states the problem count the plan requires`);
    assert.ok(text.includes(ref.excerpt), `${id}: the pin is verbatim in the page`);
    // The volatile half: a new model evaluation must not fail the board.
    assert.ok(!/\d+ models/.test(ref.excerpt), `${id}: the model count is deliberately not pinned`);
    assert.match(text.slice(text.indexOf(ref.excerpt)), /^[^]*?\d+ models/,
      `${id}: the page does state a model count right after the pin, so leaving it out is a choice`);
  }
});

test('D193.2: reformatting, a changed dictionary and a dropped column all still fail closed', () => {
  const coreUrl = 'https://lisanbench.com/data/core.json';
  const core = { ...entry('lisanbench::0.2.0').evidence.find((s) => s.url === coreUrl),
    review_content: 'excerpt' };
  const body = bodies.get(coreUrl);
  assert.doesNotThrow(() => protocolSourceContent('lisanbench::0.2.0', core, body));
  // A different word set.
  assert.throws(() => protocolSourceContent('lisanbench::0.2.0', core,
    body.replace('"num_words":50', '"num_words":75')), /methodology passage changed/);
  // A different dictionary.
  assert.throws(() => protocolSourceContent('lisanbench::0.2.0', core,
    body.replace('scowl_2026_02_25', 'scowl_2026_08_01')), /methodology passage changed/);
  // And the shape that started D193: a description of the payload offered as a passage.
  for (const note of ['"num_models": 154, "num_words": 50',
    'per_word: 7700 rows (154 models x 50 starting words); stop_reasons: one entry per trial']) {
    assert.throws(() => protocolSourceContent('probe', { excerpt: note, review_content: 'excerpt' }, body),
      /methodology passage changed/, `a payload description must not pass as a passage: ${note.slice(0, 40)}`);
  }
});

// D193.2, second group (iteration 212). Three more references, one per entry, each of which had
// simply never been examined. Checked first for what the broken excerpt was hiding, per D193.3 —
// and in all three cases the answer is nothing: the sources say exactly what the registry claims,
// and every excerpt failed for a mechanical reason.
//
//   * `aider-polyglot` quoted the page's own two sentences with the line breaks taken out and the
//     typographic apostrophe replaced by a plain one. The extracted text breaks lines mid-sentence,
//     so it could never match. The pin is now the half-sentence that carries the protocol —
//     225 Exercism exercises across six named languages — which is contiguous in the extraction.
//   * `mls-bench-lite` joined three separate passages of the README with ellipses and dropped the
//     Markdown emphasis markers. The pin is now the one sentence that defines the Lite identity,
//     with its `**` markers, exactly as the README writes it.
//   * `programbench` was an editorial locator note and never a passage at all. The pin is now the
//     board's hero paragraph. The **200 tasks** count and the *Updated Sep. 9, 2026* line are
//     deliberately left out: both move whenever ProgramBench evaluates another model, and a guard
//     that fires on a new model is D193 over again.
const SECOND_GROUP = {
  'aider-polyglot::snapshot-2026-09-10': 'https://aider.chat/docs/leaderboards/',
  'mls-bench-lite::30-tasks': 'https://raw.githubusercontent.com/Imbernoulli/MLS-Bench/main/README.md',
  'programbench::1': 'https://programbench.com/',
};

test('D193.2: the three newly examined references quote their own source', () => {
  for (const [id, url] of Object.entries(SECOND_GROUP)) {
    const reference = entry(id).evidence.find((s) => s.url === url);
    assert.ok(reference, `${id}: ${url} is still a reference of this entry`);
    const body = bodies.get(url);
    assert.ok(body, `${id}: ${url} is in the retained capture set`);
    assert.doesNotThrow(() => protocolSourceContent(id, reference, body), `${id}: ${url}`);
    // Forced, so a source shrinking under the review bound cannot make this pass vacuously.
    assert.equal(protocolSourceContent(id, { ...reference, review_content: 'excerpt' }, body),
      reference.excerpt, `${id}: ${url} does not quote its own source`);
    // The guard collapses whitespace on both sides, so uniqueness is asked the same way.
    assert.equal(body.replace(/\s+/g, ' ').split(reference.excerpt.replace(/\s+/g, ' ').trim()).length - 1, 1,
      `${id}: the pin should occur exactly once in the source`);
  }
});

test('D193.2: none of the three broken excerpts was hiding a changed source', () => {
  const aider = bodies.get(SECOND_GROUP['aider-polyglot::snapshot-2026-09-10']);
  for (const language of ['C++', 'Go', 'Java', 'JavaScript', 'Python', 'Rust']) {
    assert.ok(aider.includes(language), `aider: ${language} is still one of the polyglot languages`);
  }
  assert.match(aider, /225 challenging Exercism coding exercises/);
  // The old excerpt's first sentence is still there too — only its whitespace differs.
  assert.match(aider, /Aider excels with LLMs skilled at writing and\s+editing\s+code,/);

  const mls = bodies.get(SECOND_GROUP['mls-bench-lite::30-tasks']);
  assert.match(mls, /geometric mean; switched to arithmetic mean/);
  for (const adopter of ['adopted by Alibaba (Qwen)', 'adopted by Moonshot (Kimi)']) {
    assert.ok(mls.includes(adopter), `mls-bench: "${adopter}" is still in the README`);
  }

  const program = bodies.get(SECOND_GROUP['programbench::1']);
  assert.ok(program.includes('200 tasks'), 'programbench: the task count is still stated');
  assert.ok(program.includes('mini-SWE-agent'), 'programbench: the harness is still named');
});

test('D193.2: the ProgramBench pin leaves out what moves with every new evaluation', () => {
  const pin = entry('programbench::1').evidence
    .find((s) => s.url === SECOND_GROUP['programbench::1']).excerpt;
  for (const volatile of ['200 tasks', 'Updated Sep. 9, 2026']) {
    assert.ok(!pin.includes(volatile), `${volatile} is deliberately not pinned`);
    assert.ok(bodies.get(SECOND_GROUP['programbench::1']).includes(volatile),
      `the capture does carry "${volatile}", so leaving it out is a choice and not an absence`);
  }
});

// D193.2, fourth group. The two `researchclawbench::40-tasks` references iteration 211 called
// "unfixable as written": both excerpts carried a literal `…` in the middle of the passage they
// claimed to quote. Checked for what they were hiding first — again nothing. The two get the two
// treatments this file already established:
//
//   * `app.js` is the page's own scoring code, so it is pinned verbatim. This is the passage that
//     states an agent's headline number: the arithmetic mean of its finite per-task scores.
//   * `leaderboard.json` is 355 KB of tasks, agents and scores with no prose whatsoever, so it
//     becomes a `literal field` locator, exactly as LisanBench's `rankings.json` did.
const RCB = 'researchclawbench::40-tasks';
const RCB_APP = 'https://internscience.github.io/ResearchClawBench-Home/static/app.js';
const RCB_BOARD = 'https://internscience.github.io/ResearchClawBench-Home/data/leaderboard.json';

test('D193.2: the ResearchClawBench scoring function is pinned verbatim and occurs once', () => {
  const reference = entry(RCB).evidence.find((s) => s.url === RCB_APP);
  const body = bodies.get(RCB_APP);
  assert.ok(body, 'the app.js capture is retained');
  assert.equal(protocolSourceContent(RCB, { ...reference, review_content: 'excerpt' }, body), reference.excerpt);
  assert.equal(body.replace(/\s+/g, ' ').split(reference.excerpt.replace(/\s+/g, ' ').trim()).length - 1, 1);
  // The pin has to be the mean, not a paraphrase of it: that is the number the board ranks on.
  assert.match(reference.excerpt, /scores\.reduce\(\(a, b\) => a \+ b, 0\) \/ scores\.length/);
  assert.ok(!reference.excerpt.includes('…'), 'no ellipsis survives in the pin');
});

test('D193.2: the ResearchClawBench payload is a field locator, and it was hiding nothing', () => {
  const reference = entry(RCB).evidence.find((s) => s.url === RCB_BOARD);
  assert.match(reference.excerpt, /literal field/, 'a prose-free payload is a locator, not a passage');
  const body = bodies.get(RCB_BOARD);
  assert.ok(body, 'the leaderboard.json capture is retained');
  // Everything the broken excerpt claimed is still in the payload, which is why this is a
  // formatting repair and not a source change.
  for (const claim of ['"tasks"', '"agents"', '"scores"', '"frontier"', 'Astronomy_000', 'Physics_003',
    'ResearchHarness (Claude-Opus-4.8)']) {
    assert.ok(body.includes(claim), `leaderboard.json still carries ${claim}`);
  }
  assert.ok(body.includes(reference.excerpt.split(' ')[0].replaceAll('"', '')),
    'the locator names a field the payload really has');
});

// D193.2, fifth and last group (iteration 213). The five references iteration 212 left as
// "decisions, not edits". Both decisions turned out to be answerable, and one of them corrects a
// hypothesis this file itself carried:
//
//   * The three AA entries share one reference — the Intelligence Index composition table on the
//     methodology page. Iteration 212 filed it as a Composite-touching change (v4.3 → v4.3.2). It
//     is not that either. The old excerpt was verbatim in the 2026-09-21T02:24Z capture it names;
//     word-diffed against the 2026-09-24T19:31Z one it differs in exactly eleven tokens, all of
//     them a column AA *added*: the `Private` header and its ten per-row ✓/✗ values. So the source
//     really did change — the guard was right to refuse — but what changed is a new disclosure
//     column, not the index: the same ten evaluations, the same four category weights, the same
//     per-evaluation weightings, still v4.3.2. The three references therefore move to the newer
//     capture and pin the table as AA now prints it. No Composite input moved.
//   * The two `jevbench*` references were blocked on D193.3, which is settled in the same
//     iteration: `jevbench::v1.1`'s `scoring.metric` now states the Balanced 33:33:33 headline the
//     pinned tag v1.1.2 artifact publishes. Both excerpts were digests of fields from
//     non-adjacent places in a sorted-key JSON document, so they could never match. Each now pins
//     the contiguous block that carries the protocol identity, and v1.1 gains a second reference
//     pinning the `revision_note` — the passage that states the headline weighting, and the one a
//     reviewer needs to check `scoring.metric` against. A guard that always fails reports nothing;
//     that is why this passage was unreadable for six days.
const AA_TABLE_ENTRIES = ['aa-briefcase::1.1', 'aa-gdp-pdf::snapshot-2026-09-21', 'aa-gdpval::2.1'];
const AA_METHODOLOGY = 'https://artificialanalysis.ai/methodology/intelligence-benchmarking';
const JEV = {
  'jevbench::v1': 'https://raw.githubusercontent.com/fstandhartinger/jevbench/main/results/jevbench-v1-results.json',
  'jevbench::v1.1': 'https://raw.githubusercontent.com/fstandhartinger/jevbench/v1.1.2/results/v1.1/jevbench-v1.1-results.json',
};
const tableReference = (id) =>
  entry(id).evidence.find((s) => s.url === AA_METHODOLOGY && /^Category Evaluation Questions/.test(s.excerpt));

test('D193.2: the AA composition table is pinned verbatim for all three entries, identically', () => {
  const body = bodies.get(AA_METHODOLOGY);
  assert.ok(body, 'the AA methodology capture is retained');
  const pins = new Set();
  for (const id of AA_TABLE_ENTRIES) {
    const reference = tableReference(id);
    assert.ok(reference, `${id}: the composition-table reference`);
    pins.add(reference.excerpt);
    assert.equal(protocolSourceContent(id, { ...reference, review_content: 'excerpt' }, body),
      reference.excerpt, `${id}: the table pin does not quote its own source`);
    assert.equal(body.replace(/\s+/g, ' ').split(reference.excerpt).length - 1, 1,
      `${id}: the table pin should occur exactly once`);
  }
  // One table, one pin: three entries citing it must not drift apart.
  assert.equal(pins.size, 1, 'the three entries pin the same passage');
});

test('D193.2: what changed in the AA table is a new column, not the index composition', () => {
  const pin = tableReference('aa-briefcase::1.1').excerpt;
  // The index the page describes, and the ten evaluations it says make it up.
  assert.match(bodies.get(AA_METHODOLOGY), /Artificial Analysis Intelligence Index v4\.3\.2/);
  const composition = [['AA-Briefcase v1.1', '15%'], ['GDPval-AA v2.1', '10%'],
    ['AutomationBench-AA', '5%'], ['Terminal-Bench 4.0', '10%'], ['SciCode', '10%'],
    ['AA-Omniscience', '15%'], ['GDP.pdf', '10%'], ['AA-LCR v1.1', '5%'],
    ['HLE (Humanity’s Last Exam)'.replace('’', "'"), '10%'], ['CritPt', '10%']];
  for (const [evaluation, weight] of composition) {
    assert.ok(pin.includes(evaluation), `the pin names ${evaluation}`);
  }
  // The four category weights the page states, and the per-evaluation weights summing to 100 %.
  for (const category of ['Agents (30%)', 'Coding (20%)', 'General (30%)', 'Scientific Reasoning (20%)']) {
    assert.ok(pin.includes(category), `the pin names ${category}`);
  }
  assert.equal(composition.reduce((sum, [, w]) => sum + Number.parseInt(w, 10), 0), 100);
  // The eleven tokens that made the old excerpt fail: a column AA added, not a changed index.
  assert.ok(pin.includes('Tool Usage Private'), 'the Private column is part of the table');
  assert.equal((pin.match(/ [✓✗] [✓✗] /g) ?? []).length + (pin.match(/ [✓✗] [✓✗]$/g) ?? []).length, 10,
    'every one of the ten rows carries both its Tool Usage and its Private symbol');
});

test('D193.2: the older AA capture is what the old pin quoted, and it is the column that moved', () => {
  // The honest record of the change: the predecessor capture the three references used to name has
  // the table without the Private column, and today's has it. That is the whole difference, and it
  // is why the guard started failing on 2026-09-24 rather than on the day the excerpt was written.
  const before = execFileSync('python3',
    ['ops/daily/public-candidate.py', 'text',
      'data/raw/benchmarks/daily-evidence/2026-09-21-aa-methodology/dc576b98ac473011f36a.gz'],
    { cwd: repo, encoding: 'utf8', maxBuffer: 32_000_000 }).replace(/\s+/g, ' ');
  const after = bodies.get(AA_METHODOLOGY).replace(/\s+/g, ' ');
  assert.ok(before.includes('Scoring Intelligence Index Weighting Tool Usage Agents (30%)'),
    'the 2026-09-21 capture prints the table without a Private column');
  assert.ok(!before.includes('Tool Usage Private'), 'and it really does not carry one');
  assert.ok(after.includes('Scoring Intelligence Index Weighting Tool Usage Private Agents (30%)'),
    'the 2026-09-24 capture adds it');
  // Both captures still describe the same index version, which is what rules out a re-basing.
  for (const text of [before, after]) {
    assert.ok(text.includes('Artificial Analysis Intelligence Index v4.3.2'));
  }
  // And the pin is checked against the capture it now names, not against a newer one by accident.
  const reference = tableReference('aa-briefcase::1.1');
  assert.equal(reference.file,
    'data/raw/benchmarks/daily-evidence/2026-09-24-aa-methodology/c97fd4e69b482e88e472.gz');
  assert.equal(createHash('sha256').update(readFileSync(new URL(reference.file, repo))).digest('hex'),
    reference.sha256, 'the registry hash is the gzip hash of the capture it names');
});

test('D193.2/D193.3: both JevBench artifacts are pinned verbatim on contiguous blocks', () => {
  for (const [id, url] of Object.entries(JEV)) {
    const body = bodies.get(url);
    assert.ok(body, `${id}: the artifact capture is retained`);
    const references = packetReferences(entry(id)).filter((r) => r.url === url);
    assert.ok(references.length >= 1, `${id}: at least one reviewed reference`);
    for (const reference of references) {
      assert.equal(protocolSourceContent(id, { ...reference, review_content: 'excerpt' }, body),
        reference.excerpt, `${id}: ${reference.excerpt.slice(0, 40)}… does not quote its own source`);
      assert.equal(body.replace(/\s+/g, ' ').split(reference.excerpt).length - 1, 1,
        `${id}: the pin should occur exactly once`);
      // The shape that broke both: fields collected from non-adjacent places in sorted-key JSON.
      assert.match(reference.excerpt, /^"[a-z_]+": /, `${id}: a pin starts where a JSON line starts`);
      assert.ok(!/—/.test(reference.excerpt), `${id}: no editorial sentence survives in the pin`);
    }
    // Whatever else it pins, the identity of the protocol has to be in the packet.
    assert.ok(references.some((r) => r.excerpt.includes(`"protocol": "${id}"`)),
      `${id}: the reviewed references state the protocol id`);
  }
});

test('D193.3: the registry metric is the one the pinned v1.1.2 artifact publishes', () => {
  const e = entry('jevbench::v1.1');
  const artifact = read('data/raw/benchmarks/jevbench/v1.1/jevbench-v1.1-results.json');
  // The fetched copy and the committed copy really are the same bytes, so the pin binds both.
  const receipt = captures.find((c) => c.url === JEV['jevbench::v1.1']);
  assert.equal(receipt.sha256, e.evidence[0].sha256,
    'the retained capture hashes to the sha256 the registry declares');
  assert.equal(artifact.revision, 'v1.1.2');
  // Balanced, not 60:20:20 — the defect D193.3 named.
  for (const part of ['capability', 'speed', 'cost']) {
    assert.ok(Math.abs(artifact.weights[part] - 1 / 3) < 1e-9, `${part} is weighted 1/3`);
  }
  assert.match(e.scoring.metric, /\(Capability \+ Speed \+ Cost\) \/ 3/);
  assert.match(e.scoring.metric, /Balanced 33:33:33/);
  assert.match(e.scoring.metric, /v1\.1\.2/);
  assert.ok(!/0\.6 x Capability/.test(e.scoring.metric),
    'the superseded 60:20:20 headline is no longer stated as the metric');
  // The old headline is recorded rather than erased, and named as what it now is.
  assert.match(e.scoring.notes, /60:20:20/);
  assert.match(e.scoring.notes, /Emphasis on Accuracy/);
  assert.ok(Object.keys(artifact.sensitivity_weightings).some((k) => /60:20:20|Emphasis on Accuracy/.test(k))
    || JSON.stringify(artifact.sensitivity_weightings).includes('0.6'),
    'and 60:20:20 really does survive as one of the published weightings');
  // The Cost scale the same revision widened; the registry stated the pre-v1.1.2 one.
  assert.match(e.scoring.notes, /\$0\.001 = 100/);
  assert.match(artifact.scoring.cost, /\$0\.001 per 1,000 = 100/);
});

test('D193.3: no published value was relabelled by the metric correction', () => {
  const scores = read('data/raw/benchmarks/scores.json');
  for (const id of Object.keys(JEV)) {
    assert.equal(scores.observations.filter((o) => o.benchmark_id === id).length, 0,
      `${id}: the metric correction may only touch a row that carries no observation`);
    assert.ok(scores.collections.some((c) => c.benchmark_id === id && c.status === 'manual_required'),
      `${id}: the row is still declared manual_required rather than silently collected`);
  }
});

// D196 (iteration 213). Found by asking the scanner the same question against a *wider* capture set:
// the 2026-09-24T19:20Z run does not fetch every source, so 30 references were reported `unmeasured`
// and their guard state was simply unknown. Six of those nine URLs are fetched by some daily run, and
// merging each one's newest capture into the set surfaced a seventh group in exactly the D193 shape —
// the seven Claude Opus 5.5 system-card entries, whose excerpts read
// `"<Benchmark>: <row> (columns: Claude Opus 5.5 | …)"`. Neither the `"<Benchmark>: "` prefix nor the
// `(columns: …)` annotation is in the card; it is our own reading, and it already lives where it
// belongs, in each entry's `how_to_collect.locator`.
//
// Checked first for what they were hiding, per D193.3: nothing. Every value is in the card's Table
// 8.1.A byte for byte. Each pin is now the contiguous block from that table's column header down to
// the entry's own row, so the excerpt itself proves both the numbers and which column is Opus 5.5 —
// the one thing the old annotation was there to say. Intermediate rows are inside the pin on purpose:
// a system card is a frozen PDF, so a vendor revising a published number is exactly what should fail.
const CARD = 'https://www.anthropic.com/claude-opus-5-5-system-card';
const CARD_FILE = 'data/raw/benchmarks/daily-evidence/2026-09-22-claude-opus-5-5/95a7b26f5d4497072d97.gz';
const CARD_ROWS = {
  'anthropic-swe-bench-pro::snapshot-2026-09-22': 'SWE-bench Pro 89.9 79.2 81.2 –',
  'anthropic-swe-bench-multilingual::snapshot-2026-09-22': 'SWE-bench Multilingual 93.9 89.5 89.1 -',
  'anthropic-swe-bench-multimodal::snapshot-2026-09-22': 'SWE-bench Multimodal 61.4 59.4 54.7 -',
  'anthropic-hle-no-tools::snapshot-2026-09-22': 'Humanity’s Last Exam No tools 64.4 56.6 60.9 –',
  'anthropic-osworld-2-0-strict::2.0': 'OSWorld 2.0 (partial/strict) 81.8/48.7 74.0/37.2 80.7/42.8 –',
  'anthropic-healthbench-professional::snapshot-2026-09-22': 'HealthBench Professional 65.6 59.8 62.1 63.4',
  'anthropic-aa-briefcase-v1-1::1.1': 'AA-Briefcase v1.1 1822 1673 1678 1569',
};
const cardText = execFileSync('python3', ['ops/daily/public-candidate.py', 'text', CARD_FILE],
  { cwd: repo, encoding: 'utf8', maxBuffer: 32_000_000 });

test('D196: the seven system-card references quote the card, header row and all', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL(CARD_FILE, repo))).digest('hex'),
    entry('anthropic-swe-bench-pro::snapshot-2026-09-22').evidence
      .find((s) => s.url === CARD).sha256, 'the retained card still matches its receipt');
  const flat = cardText.replace(/\s+/g, ' ');
  for (const [id, row] of Object.entries(CARD_ROWS)) {
    const reference = entry(id).evidence.find((s) => s.url === CARD);
    assert.ok(reference, `${id}: the system-card reference`);
    assert.equal(protocolSourceContent(id, { ...reference, review_content: 'excerpt' }, cardText),
      reference.excerpt, `${id}: the pin does not quote the card`);
    assert.equal(flat.split(reference.excerpt).length - 1, 1, `${id}: the pin should occur exactly once`);
    // The pin has to carry the column header, which is the only thing that says 89.9 is Opus 5.5's.
    assert.ok(reference.excerpt.startsWith('Evaluation Claude family models Other models Claude Claude Claude GPT-6 Opus 5.5 Opus 5 Fable 5.1 Astra'),
      `${id}: the pin opens with Table 8.1.A's column header`);
    assert.ok(reference.excerpt.endsWith(row), `${id}: the pin ends on this entry's own row`);
    // The shapes that made the old excerpts fail must not come back.
    assert.ok(!/\(columns:/.test(reference.excerpt), `${id}: no editorial column annotation in the pin`);
    assert.ok(!reference.excerpt.includes(`${row.split(' ')[0]}: `), `${id}: no "<Benchmark>: " prefix in the pin`);
    // The mapping the annotation used to carry still has a home, and it is the right one.
    assert.match(entry(id).how_to_collect.locator, /Claude Opus 5\.5/);
  }
});

test('D196: none of the seven was hiding a revised system card', () => {
  const flat = cardText.replace(/\s+/g, ' ');
  for (const row of Object.values(CARD_ROWS)) {
    assert.ok(flat.includes(row), `Table 8.1.A still prints "${row}"`);
  }
  // And the card is still the one the entries name: same table, same four columns, same caption.
  assert.ok(flat.includes('[Table 8.1.A] Capability evaluation summary.'));
  assert.ok(flat.includes('8.1 Evaluation summary'));
  // A revised number must fail closed rather than pass on the neighbouring rows.
  const probe = entry('anthropic-aa-briefcase-v1-1::1.1').evidence.find((s) => s.url === CARD);
  assert.throws(() => protocolSourceContent('probe', { ...probe, review_content: 'excerpt' },
    cardText.replace('1822', '1823')), /methodology passage changed/);
});
