// CR-92: JevBench v1.2 final — every axis recomputes from its published inputs, every score from its axes (geometric mean),
// the speed note calls the latency adjustment an assumption, one open-alternative-jev row, no automatic cost of 100.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JEVBENCH_V12_ARTIFACT, JEVBENCH_V12_SHA256, readJevbenchV12, validateJevbenchV12, jevbenchV12View, geometric, speedScore, costScore, adjustedLatency } from '../lib/jevbench-v12.mjs';
import { PRESETS, DEFAULT_WEIGHTS, parseParams, toParam, rerank, describe, isDefault } from '../lib/jevbench-v12-weights.mjs';

const clone = async () => JSON.parse(await readFile(JEVBENCH_V12_ARTIFACT, 'utf8'));

test('the committed v1.2 artifact is the tagged public one and validates; the Score Lab top of the ranking', async () => {
  const d = await readJevbenchV12();
  assert.equal(d.sha256, JEVBENCH_V12_SHA256);
  const v = jevbenchV12View(d);
  const top = v.ranked.slice(0, 12).map((r) => [r.key, Number(r.main.toFixed(1))]);
  // CR-93: v1.2.1 added djev; CR-95: v1.2.2 adds five requested systems; CR-96: v1.2.3 corrects every price (each of the
  // 534 decisions counted once and priced once). No measurement changed and no rank changed; scores move by <= 0.3.
  // CR-97: v1.2.4 takes classifier.dev out of the ranking — it runs Jev — so Jev is #1 and every row below moves up one.
  // CR-107: v1.2.7 adds the two GLiNER2.5 checkpoints; jqv is a partial row and therefore not in this list.
  const all = v.ranked.map((r) => [r.key, Number(r.main.toFixed(1))]);
  assert.deepEqual(all, [['jev-1.13.0', 75.4], ['semif-qwen3.5-4b', 74.7], ['djev', 74.3], ['openjev-verdict-1.4', 72.5], ['laya', 70.1],
    ['open-alternative-jev', 69.8], ['system-one-open', 68.9], ['openjev-razorback16', 67.7], ['simplejev-qwen3.8-27b', 67.3], ['jeff', 66.9], ['kev-0.6b', 66.7],
    ['openjev-sglang', 66.3], ['openjev-verdict', 66.2], ['gpt-5.6-luna', 66.2], ['open-jev-deberta-v3-large', 64.6], ['simplejev-qwen3.6-35b-a3b', 63.8],
    ['nimble-9b', 63.7], ['kev-0.5b', 63.1], ['gliner2.5-multi', 63.1], ['kev-4b', 62.2], ['gliner2.5-small', 62.1],
    ['gemini-3.1-flash-lite', 60.9], ['kev-8b', 58.3],
    ['deepseek-flash', 57.8], ['system-one-sg', 56.6], ['gliner2', 53.0]]);
  assert.equal(v.revision, 'v1.2.7');
  // CR-96: the unit travels with the artifact and names what it is not, so no surface can imply per-token prices.
  assert.equal(v.costUnit.unit, '$ per 1,000 decisions');
  assert.equal(v.costUnit.not_unit, '$ per 1,000 tokens');
  assert.match(v.costUnit.worked_example, /per MILLION input tokens/);
  assert.match(v.scoring.cost, /not per 1,000 tokens/i);
  // Jev's own price is its public tariff times its measured tokens: $0.042 per million input, output free.
  const jevRow = v.ranked.find((r) => r.key === 'jev-1.13.0');
  assert.ok(Math.abs(jevRow.usd - (v.costUnit.mean_input_tokens_per_decision_jev * 1000 * 0.042) / 1e6) < 1e-9);
  // Every corrected row is small and no rank moved: the correction table only ever changes the price.
  for (const [key, c] of Object.entries(v.costCorrectionTable)) assert.ok(Math.abs(c.pct) < 15, key);
  const dj = v.ranked.find((r) => r.key === 'djev');
  assert.ok(dj.display === 'djev (Maisa, diffusion-gemma)' && dj.costKind === 'announced' && /announced/i.test(dj.costBasis) && dj.endpointKind === 'api' && dj.p50Adj === dj.p50 && dj.axes.cost < 100 && dj.footnote);
  // CR-95: the new rows carry their own type, a price that is not 100, and a footnote; the four local ones are adjusted.
  // CR-97: classifier.dev keeps all of that and loses only its rank — it is the honorable mention, not a ranked row.
  assert.deepEqual(v.honorable.map((r) => [r.key, Number(r.main.toFixed(1))]), [['classifier-dev-fast', 84.8]]);
  const [cd] = v.honorable;
  assert.ok(cd.cls === 'jev-service' && cd.endpointKind === 'api' && cd.p50Adj === cd.p50 && cd.costKind === 'estimate' && /Pro \$20\/month/.test(cd.costBasis) && cd.footnote);
  assert.ok(cd.rank === null && cd.ranked === false && cd.listing === 'honorable_mention' && cd.notRankedBecause);
  assert.ok(cd.main > v.ranked[0].main, 'the point of the rule: an honorable mention may outscore #1');
  const hm = v.honorableMentions.systems['classifier-dev-fast'];
  assert.equal(hm.runs_on_key, 'jev-1.13.0');
  assert.match(v.honorableMentions.rule, /not ranked against the models/);
  assert.match(v.scoring.ranked, /not ranked against the models/);
  // The published reason must carry the facts Florian asked for: whose model, what the smart tier is, and the flat-rate caveat.
  assert.match(hm.why_not_ranked, /The fast tier is Jev/);
  assert.match(hm.why_not_ranked, /0\.7 confidence/);
  assert.match(hm.why_not_ranked, /not best-of-N/);
  assert.match(hm.tier_measured, /never run/);
  assert.match(hm.price_note, /\$0\.033 per 1,000/);
  assert.match(hm.not_pass_through, /97\.3 %/);
  for (const k of ['laya', 'jeff', 'gliner2', 'openjev-verdict']) {
    const r = v.ranked.find((x) => x.key === k);
    assert.ok(r && r.endpointKind === 'cpu' && Math.abs(r.p50Adj - (2 * r.p50 + 0.15)) < 1e-9 && r.axes.cost < 100 && r.footnote, k);
  }
  assert.equal(v.ranked.find((r) => r.key === 'gliner2').cls, 'classifier');
  assert.equal(v.ranked.filter((r) => r.key.startsWith('open-alternative-jev')).length, 1);
  assert.equal(v.ranked.find((r) => r.key === 'open-alternative-jev').display, 'open-alternative-jev (Qwen3.5-4B, IkerMoel)');
  // CR-107: jqv joins the partial rows — its endpoint is the submitter's own machine, so the held-out hard
  // items were never sent to it and the run covers 425 of 534 decisions.
  assert.ok(v.partial.length === 4 && v.partial.every((r) => r.rank === null && r.listing === 'partial'));
  const jqv = v.partial.find((r) => r.key === 'jqv');
  assert.ok(jqv && jqv.endpointKind === 'demo' && /425 of 534/.test(jqv.footnote));
  // Needle 3 options-as-tools has a price at all (v1.2 gave it an automatic 100); CR-96 corrected it from $0.0162 to $0.0144.
  const tools = v.partial.find((r) => r.key === 'needle-3-tools');
  assert.ok(tools.usd > 0.014 && tools.usd < 0.0145 && tools.axes.cost < 100 && tools.costKind === 'estimate');
  assert.match(v.speedNote, /assumption/);
});

test('scales and the latency adjustment', () => {
  assert.equal(adjustedLatency(0.5, 'api'), 0.5);
  assert.ok(Math.abs(adjustedLatency(0.5, 'demo') - 1) < 1e-12 && Math.abs(adjustedLatency(0.5, 'gpu') - 1.15) < 1e-12);
  assert.ok(Math.abs(speedScore(1, 1, 'api') - 80) < 1e-9 && Math.abs(costScore(0.01) - 70) < 1e-9);
  assert.ok(Math.abs(geometric({ intelligence: 90, calibration: 90, speed: 90, cost: 10 }, DEFAULT_WEIGHTS) - Math.exp((3 * Math.log(90) + Math.log(10)) / 4)) < 1e-9);
});

test('a score or axis that does not recompute, a missing price or a re-ordered rank fails', async () => {
  let a = await clone(); a.systems[0].jevbench_score += 0.1;
  assert.throws(() => validateJevbenchV12(a), /does not recompute/);
  a = await clone(); a.systems[1].axes.speed += 1;
  assert.throws(() => validateJevbenchV12(a), /speed does not recompute/);
  a = await clone(); a.systems.at(-1).cost.usd_per_1000 = null;
  assert.throws(() => validateJevbenchV12(a), /cost/);
  a = await clone(); [a.systems[0].rank, a.systems[1].rank] = [2, 1];
  assert.throws(() => validateJevbenchV12(a), /rank/);
  a = await clone(); a.speed_note = 'adjusted';
  assert.throws(() => validateJevbenchV12(a), /assumption/);
  a = await clone(); a.systems[0].predictions = [];
  assert.throws(() => validateJevbenchV12(a), /item-level/);
});

// CR-97: the honorable-mention rule is what keeps a service on another entrant's model out of the ranking. If any of
// these could pass, the row could quietly take a rank again, or lose one without the reason being published.
test('an honorable mention that takes a rank, loses its rule or loses the model it runs fails', async () => {
  const hmKey = (a) => a.systems.find((s) => s.listing === 'honorable_mention').key;
  let a = await clone(); const key = hmKey(a);
  const hm = (x) => x.systems.find((s) => s.key === key);
  // Ranking it again — either by the flag or by handing it a rank number.
  hm(a).ranked = true;
  assert.throws(() => validateJevbenchV12(a), /ranked\/partial must agree with listing/);
  a = await clone(); hm(a).rank = 1;
  assert.throws(() => validateJevbenchV12(a), /only a ranked system carries a rank/);
  a = await clone(); hm(a).listing = 'ranked'; hm(a).ranked = true; hm(a).rank = 1;
  assert.throws(() => validateJevbenchV12(a), /rank must follow the JevBench Score/);
  // Dropping the published rule or the reason.
  a = await clone(); a.honorable_mentions.rule = 'not ranked';
  assert.throws(() => validateJevbenchV12(a), /honorable_mentions.rule must state the rule/);
  a = await clone(); a.scoring.ranked = 'Ranked: every tier attempted for >= 95 % of its decisions.';
  assert.throws(() => validateJevbenchV12(a), /must carry the honorable-mention rule/);
  a = await clone(); delete a.honorable_mentions.systems[key].price_note;
  assert.throws(() => validateJevbenchV12(a), /price_note/);
  a = await clone(); hm(a).not_ranked_because = 'because';
  assert.throws(() => validateJevbenchV12(a), /must repeat the published reason/);
  // The model it runs must exist and be ranked: "not ranked" is only fair if the model itself is in the list.
  a = await clone(); a.honorable_mentions.systems[key].runs_on_key = 'no-such-system';
  assert.throws(() => validateJevbenchV12(a), /must name another, ranked system/);
  a = await clone(); a.honorable_mentions.systems[key].runs_on_key = key;
  assert.throws(() => validateJevbenchV12(a), /must name another, ranked system/);
  a = await clone(); a.honorable_mentions.systems[key].sources = ['classifier.dev'];
  assert.throws(() => validateJevbenchV12(a), /sources/);
  // A row marked honorable_mention with no published entry, and an entry with no row.
  a = await clone(); Object.assign(a.systems.find((s) => s.key === 'gliner2'), { listing: 'honorable_mention', ranked: false, rank: null });
  assert.throws(() => validateJevbenchV12(a), /must match the rows marked honorable_mention/);
  a = await clone(); delete a.honorable_mentions.systems[key];
  assert.throws(() => validateJevbenchV12(a), /must match the rows marked honorable_mention/);
});

test('presets recompute to the published views; URL weights round-trip; the default is the JevBench Score', async () => {
  const v = jevbenchV12View(await readJevbenchV12());
  for (const p of PRESETS) {
    const { ranked } = rerank(v.ranked, v.partial, p.w);
    for (const r of ranked) { assert.ok(Math.abs(r.score - r.presets[p.artifactKey]) < 1e-9, `${p.id} ${r.key}`); assert.equal(r.rank, r.rankUnder[p.artifactKey]); }
  }
  assert.ok(isDefault(parseParams('')) && describe(DEFAULT_WEIGHTS).official);
  assert.equal(toParam(DEFAULT_WEIGHTS), null);
  const acc = PRESETS.find((p) => p.id === 'accuracy').w;
  assert.equal(toParam(acc), '60-0-20-20');
  assert.deepEqual(parseParams('w=60-0-20-20'), acc);
  assert.ok(!describe(acc).official);
  assert.ok(isDefault(parseParams('w=-10-20-20-20')) && isDefault(parseParams('w=10-20-20')));
});

test('Jev chart names wrap on phones and only truncate at the desktop breakpoint', async () => {
  const source = await readFile(new URL('../components/JevModelsV12.tsx', import.meta.url), 'utf8');
  assert.match(source, /min-w-0 md:truncate sm:col-start-2/);
  assert.doesNotMatch(source, /min-w-0 truncate sm:col-start-2/);
});

// Fable pass 24 (2026-09-19): the Jev page's presentational rules, checked at the source so a refactor cannot undo them silently.
test('Jev page pass-24 rules: no stretched presets, wrapping I/C/S/K line on phones, $ per 1,000 before the tiers, one one-liner', async () => {
  const cmp = await readFile(new URL('../components/JevModelsV12.tsx', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(cmp, /grid-cols-2 gap-2 lg:grid-cols-6 lg:items-start/, 'F-126: preset buttons must not stretch to the open Custom panel');
  assert.match(cmp, /row-start-3 mt-0\.5 min-w-0 font-mono text-\[10\.5px\] sm:whitespace-nowrap/, 'F-127: the axis line wraps below sm');
  assert.doesNotMatch(cmp, /row-start-3 mt-0\.5 whitespace-nowrap/, 'F-127');
  assert.ok(cmp.indexOf('<H c="usd" label="$ per 1,000"') < cmp.indexOf('{TIER_ORDER.map((t) => <H key={t}'), 'F-129: $ per 1,000 sits right after the axes');
  assert.match(cmp, /sub="official" hero/, 'F-129: a one-word header sub');
  assert.match(cmp, /cfg !== r\.author/, 'F-130: the config line is not the author repeated');
  assert.match(cmp, /"openjev-razorback16" \? "OpenJev \(razorback16\)"/, 'F-133');
  assert.doesNotMatch(page, /data-bh-jev12-score-line/, 'F-132: the one-liner lives in the chart only');
  assert.ok(page.indexOf('data-bh-jev-revision') > page.indexOf('id="method"'), 'F-132: the revision note sits in Method and tiers');
  assert.doesNotMatch(page, /' \(options as tools\)'/, 'F-131');
  assert.match(css, /\.bh-jev11-partial > \.bh-jev-sticky \{ opacity: 1;/, 'F-128');
});

test('Jev pass-24 follow-up: the chart keeps one short visible note and moves details into a legend', async () => {
  const cmp = await readFile(new URL('../components/JevModelsV12.tsx', import.meta.url), 'utf8');
  assert.match(cmp, /data-bh-jev12-legend-line>I, C, S, K/, 'F-134: the visible chart note has its own selector');
  assert.match(cmp, /<details className="mt-2" data-bh-jev12-legend>/, 'F-134: the legend disclosure has its own selector');
  assert.match(cmp, /\{chartName\(r\)\}<\/ProjectLink>\{r\.footnote \? <sup data-bh-jev12-dagger>†<\/sup>/, 'review 20260919T165003Z: the chart marks noted systems with the † the legend line promises');
  assert.equal((cmp.match(/data-bh-jev12-oneliner/g) || []).length, 1, 'review 20260919T165003Z: the score one-liner selector is unique');
  assert.equal((cmp.match(/data-bh-jev12-notes/g) || []).length, 1, 'review 20260919T165003Z: the table notes selector is unique');
  assert.match(cmp, /Legend and notes/, 'F-134: secondary notes are collapsed');
  const legendLine = cmp.match(/data-bh-jev12-legend-line>(.*?)<\/span>/)[1].replace(/<[^>]+>/g, '');
  assert.ok(legendLine.length <= 110, `F-134 (iteration 123): the visible legend sentence fits two 390 px lines (${legendLine.length} chars)`);
  assert.match(cmp, /data-bh-jev12-est-note>~ est\. = .*how costs are estimated/, 'F-134: the full est. definition moved into the legend');
  assert.match(cmp, /data-bh-jev12-ann-note>ann\. = the provider&rsquo;s announced price, not yet charged/, 'F-134: the full ann. definition moved into the legend');
  assert.match(cmp, /data-bh-jev12-label-note/, 'F-134: the label-only note is retained in the legend');
  assert.match(cmp, /data-bh-jev12-footnote=\{r\.key\}/, 'F-134: every system footnote remains addressable');
  assert.match(cmp, /I, C, S, K = Intelligence, Calibration, Speed, Cost; est\.\/ann\. = <a href="#jev-costs"/, 'F-134: visible note is concise and still links to the cost method');
});

test('Jev pass-24 follow-up: cost disclosure has a hash-open client helper', async () => {
  const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
  const helper = await readFile(new URL('../components/JevCostsDisclosure.tsx', import.meta.url), 'utf8');
  assert.match(page, /JevCostsDisclosure/, 'F-135: page uses the disclosure helper');
  assert.match(helper, /id="jev-costs"/, 'F-135: the disclosure owns the anchor');
  assert.match(helper, /window\.location\.hash !== TARGET/, 'F-135: direct hash loads are handled');
  assert.match(helper, /closest<HTMLAnchorElement>\(`a\[href=\"\$\{TARGET\}\"\]`\)/, 'F-135: in-page links open the disclosure');
  assert.match(helper, /details\.open = true/, 'F-135: hash navigation opens the panel');
  assert.match(page, /data-bh-jev-cost-rows/, 'F-135: cost rows remain inside the disclosure');
});
