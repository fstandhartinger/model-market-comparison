import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAaEfficiency, AA_EFFICIENCY_MIN_ROWS, AA_MIN_SCORED_DENOMINATOR } from "../lib/aa-efficiency.mjs";
import { refreshAaEfficiency } from "../scripts/fetch-aa-efficiency.mjs";

// Synthetic fixtures, deliberately not benchmark observations.
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const carriers = (n) => Array.from({ length: n }, (_, i) => ({
  id: uuid(i + 1), slug: `fixture-${i}`, name: `Fixture ${i} (xhigh)`,
  effort: { slug: "xhigh", label: "xhigh", level: 50 },
  intelligenceIndexOutputTokensPerTask: { reasoning: 10, answer: 20, output: 30 },
  canonicalIntelligenceIndexTokenCount: { input: 1000, output: 300, answer: 200, reasoning: 100 },
}));
const scored = (n) => Array.from({ length: n }, (_, i) => ({ id: uuid(10_000 + i), slug: `scored-${i}`, intelligenceIndex: 40 }));
const html = (items) => `<script>self.__next_f.push(${JSON.stringify([1, `a:${JSON.stringify(items)}\n`])})</script>`;
const validHtml = () => html([...carriers(AA_EFFICIENCY_MIN_ROWS), ...scored(AA_MIN_SCORED_DENOMINATOR)]);

test("efficiency parse extracts slug, UUID, variant, measured fields and derived ratios", () => {
  const parsed = parseAaEfficiency(validHtml());
  assert.equal(parsed.count, AA_EFFICIENCY_MIN_ROWS);
  assert.equal(parsed.coverage.published_rows, AA_EFFICIENCY_MIN_ROWS);
  assert.equal(parsed.coverage.scored_denominator, AA_MIN_SCORED_DENOMINATOR);
  assert.equal(parsed.basis, "measured");
  assert.equal(parsed.interpretation, "benchmark_proxy");
  const row = parsed.rows[0];
  assert.equal(row.source_id, uuid(1));
  assert.equal(row.slug, "fixture-0");
  assert.equal(row.variant, "xhigh");
  assert.deepEqual(row.tokens_per_task, { reasoning: 10, answer: 20, output: 30 });
  assert.deepEqual(row.canonical_token_counts, { input: 1000, output: 300, answer: 200, reasoning: 100 });
  assert.equal(row.derived.basis, "derived");
  assert.equal(row.derived.input_output_ratio, 1000 / 300);
  assert.equal(row.derived.reasoning_output_share, 1 / 3);
});

test("efficiency parse resolves Flight references for efficiency fields", () => {
  const fixture = carriers(AA_EFFICIENCY_MIN_ROWS);
  const referenced = fixture.map((row, i) => ({
    ...row,
    intelligenceIndexOutputTokensPerTask: `$b:items:${i}:pt`,
    canonicalIntelligenceIndexTokenCount: `$b:items:${i}:cc`,
  }));
  const joined = referenced.map((r) => ({ id: r.id, slug: r.slug, name: r.name, effort: r.effort, pt: r.intelligenceIndexOutputTokensPerTask && { ...carriers(1)[0].intelligenceIndexOutputTokensPerTask }, cc: { ...carriers(1)[0].canonicalIntelligenceIndexTokenCount } }));
  const htmlWithRefs = `<script>self.__next_f.push(${JSON.stringify([1, `b:${JSON.stringify({ items: joined })}\n`])})</script>` +
    `<script>self.__next_f.push(${JSON.stringify([1, `c:${JSON.stringify(referenced)}\n`])})</script>`;
  const parsed = parseAaEfficiency(htmlWithRefs + html(scored(AA_MIN_SCORED_DENOMINATOR)));
  assert.equal(parsed.count, AA_EFFICIENCY_MIN_ROWS);
  assert.equal(parsed.rows[0].tokens_per_task.output, 30);
});

test("efficiency parse rejects missing, malformed, partial and invalid payloads", () => {
  assert.throws(() => parseAaEfficiency("<html>unavailable</html>"), /missing|malformed/);
  const oneField = carriers(AA_EFFICIENCY_MIN_ROWS);
  delete oneField[3].canonicalIntelligenceIndexTokenCount;
  assert.throws(() => parseAaEfficiency(html([...oneField, ...scored(AA_MIN_SCORED_DENOMINATOR)])), /partial carrier/);
  const changes = [
    { id: null }, { id: "not-a-uuid" }, { slug: "" }, { name: 7 },
    { intelligenceIndexOutputTokensPerTask: { reasoning: -1, answer: 20, output: 30 } },
    { intelligenceIndexOutputTokensPerTask: { reasoning: 10, answer: 20, output: 31 } },
    { intelligenceIndexOutputTokensPerTask: { reasoning: "10", answer: 20, output: 30 } },
    { canonicalIntelligenceIndexTokenCount: { input: 1000, output: 300, answer: 200, reasoning: 101 } },
    { canonicalIntelligenceIndexTokenCount: { input: 1000, output: 0, answer: 0, reasoning: 0 } },
    { canonicalIntelligenceIndexTokenCount: { input: 1000, output: 300, answer: 200, reasoning: 100.5 } },
  ];
  for (const change of changes) {
    const rows = carriers(AA_EFFICIENCY_MIN_ROWS); Object.assign(rows[0], change);
    assert.throws(() => parseAaEfficiency(html([...rows, ...scored(AA_MIN_SCORED_DENOMINATOR)])), /invalid|missing|zero|mismatch/, JSON.stringify(change));
  }
  // Duplicate id with conflicting values.
  const dup = [...carriers(AA_EFFICIENCY_MIN_ROWS), { ...carriers(1)[0], intelligenceIndexOutputTokensPerTask: { reasoning: 1, answer: 20, output: 21 } }];
  assert.throws(() => parseAaEfficiency(html([...dup, ...scored(AA_MIN_SCORED_DENOMINATOR)])), /conflicting/);
  // Fetch without enough carriers or denominator is a partial scrape: reject.
  assert.throws(() => parseAaEfficiency(html([...carriers(AA_EFFICIENCY_MIN_ROWS - 1), ...scored(AA_MIN_SCORED_DENOMINATOR)])), /incomplete/);
  assert.throws(() => parseAaEfficiency(html([...carriers(AA_EFFICIENCY_MIN_ROWS), ...scored(AA_EFFICIENCY_MIN_ROWS - 1)])), /denominator/);
  assert.throws(() => parseAaEfficiency(html([...carriers(AA_EFFICIENCY_MIN_ROWS), ...scored(AA_MIN_SCORED_DENOMINATOR)]), { previous: { count: AA_EFFICIENCY_MIN_ROWS + 5 } }), /incomplete/);
});

test("failed or partial refresh never overwrites the previous snapshot", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aa-efficiency-test-"));
  const target = join(dir, "snapshot.json");
  const original = JSON.stringify({ count: AA_EFFICIENCY_MIN_ROWS, previous: "retain byte for byte" });
  try {
    await writeFile(target, original);
    await assert.rejects(refreshAaEfficiency({ target, html: html([...carriers(3), ...scored(AA_MIN_SCORED_DENOMINATOR)]) }), /incomplete|denominator/);
    assert.equal(await readFile(target, "utf8"), original);
    await assert.rejects(refreshAaEfficiency({ target, html: "<html>gone</html>" }), /missing|malformed/);
    assert.equal(await readFile(target, "utf8"), original);
    await assert.rejects(refreshAaEfficiency({ target, checkRobots: false, fetcher: async () => ({ ok: false, status: 503 }) }), /every model-page probe failed/);
    assert.equal(await readFile(target, "utf8"), original);
    const snapshot = await refreshAaEfficiency({ target, html: validHtml(), fetchedAt: "2026-09-10T00:00:00.000Z" });
    assert.equal(snapshot.collected_at, "2026-09-10T00:00:00.000Z");
    assert.equal(JSON.parse(await readFile(target, "utf8")).count, AA_EFFICIENCY_MIN_ROWS);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("live fetcher records attempts and only accepts the first successful probe", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aa-efficiency-test-"));
  const target = join(dir, "snapshot.json");
  const evidence = join(dir, "evidence");
  const seen = [];
  try {
    const fetcher = async (url) => {
      seen.push(url);
      if (seen.length === 1) return { ok: false, status: 404 };
      return { ok: true, status: 200, text: async () => validHtml() };
    };
    const snapshot = await refreshAaEfficiency({ target, evidenceDir: evidence, fetcher, checkRobots: false });
    assert.equal(snapshot.count, AA_EFFICIENCY_MIN_ROWS);
    assert.equal(snapshot.attempts.length, 2);
    assert.equal(snapshot.attempts[0].http_status, 404);
    assert.equal(snapshot.attempts[1].http_status, 200);
    assert.match(snapshot.attempts[1].sha256, /^[0-9a-f]{64}$/);
    const log = await readFile(join(evidence, "collector-evidence-log.jsonl"), "utf8");
    assert.ok(log.includes("http_status\":200"));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("AA stops on restrictive robots and 429 without probing alternate pages", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aa-robots-test-"));
  const target = join(dir, "snapshot.json");
  await writeFile(target, '{"count":138,"keep":true}');
  try {
    const seen = [];
    await assert.rejects(refreshAaEfficiency({ target, fetcher: async (url) => {
      seen.push(url); return { ok: true, status: 200, text: async () => "User-Agent: *\nDisallow: /models/\n" };
    } }), /robots policy/);
    assert.equal(seen.length, 1);
    const blocked = [];
    await assert.rejects(refreshAaEfficiency({ target, checkRobots: false, fetcher: async (url) => {
      blocked.push(url); return { ok: false, status: 429 };
    } }), /probe failed/);
    assert.equal(blocked.length, 1);
    assert.equal(await readFile(target, "utf8"), '{"count":138,"keep":true}');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
