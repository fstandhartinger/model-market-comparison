import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCodingAgents } from "../lib/aa-coding-agents.mjs";
import { refreshCodingAgents } from "../scripts/fetch-aa-coding-agents.mjs";
import { parseArtificialAnalysisMetadata } from "../lib/aa-rsc.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";

// Synthetic fixtures, deliberately not benchmark observations.
const rows = () => Array.from({ length: 13 }, (_, i) => ({
  id: `synthetic-${i}`, display: { model: `Fixture ${i} (max) "quoted" {name}` },
  agentName: "Fixture harness", indexScore: 0.5, indexComponentCount: 3, evalCount: 3,
  evals: ["deep-swe-v1.1", "swe-atlas-qna", "terminal-bench-v4"].map((datasetIndexName) => ({ datasetIndexName, mean: { reward: 0.5 }, weight: 1 / 3 })),
}));
const html = (items = rows(), options = {}) => {
  const records = `a:${JSON.stringify(["$", "div", null, { rows: items }])}\nb:${JSON.stringify({ title: "Performance", description: "Performance across the Artificial Analysis Coding Agent Index.", change: { description: `Coding Agent Index v${options.version || "1.5"}:` }, benchmarkRows: items.map((_, i) => `$a:props:rows:${i}`) })}\n`;
  // A Flight chunk can end in the middle of a string escape.
  return [records.slice(0, 133), records.slice(133)].map((part) => `<script>self.__next_f.push(${JSON.stringify([1, part])})</script>`).join("");
};

test("full Coding Agent board resolves Flight references and preserves exact model/harness names", () => {
  const parsed = parseCodingAgents(html());
  assert.equal(parsed.count, 13);
  assert.equal(parsed.version, "1.5");
  assert.equal(parsed.rows[0].model_name, rows()[0].display.model);
  assert.equal(parsed.rows[0].score, 0.5);
});

test("Coding Agent rejects partial, malformed, ambiguous, changed-version and invalid-score payloads", () => {
  assert.throws(() => parseCodingAgents("<html>unavailable</html>"), /missing/);
  assert.throws(() => parseCodingAgents(html(rows().slice(1))), /incomplete scrape/);
  assert.throws(() => parseCodingAgents(html(), { version: "1.5", count: 14 }), /incomplete scrape/);
  assert.throws(() => parseCodingAgents(html(), { version: "1.4", count: 68 }), /version mismatch/);
  assert.throws(() => parseCodingAgents(html(rows(), { version: "1.6" })), /version absent or changed/);
  const history = `<script>self.__next_f.push(${JSON.stringify([1, 'c:{"history":"Coding Agent Index v1.5:"}\n'])})</script>`;
  assert.throws(() => parseCodingAgents(html(rows(), { version: "1.6" }) + history), /version absent or changed/);
  for (const change of [
    { indexScore: null }, { indexScore: 2 }, { indexScore: "0.5" },
    { evalCount: 2 }, { evals: [] }, { display: {} }, { indexScore: 0.6 },
    { id: "synthetic-1" },
  ]) {
    const input = rows(); Object.assign(input[0], change);
    assert.throws(() => parseCodingAgents(html(input)), /invalid|duplicate|mismatch/);
  }
  assert.throws(() => parseCodingAgents(html().replace('$a:props:rows:0', '$a:props:rows:99')), /unresolved reference/);
  const extra = `<script>self.__next_f.push(${JSON.stringify([1, 'c:{"benchmarkRows":[]}\n'])})</script>`;
  assert.throws(() => parseCodingAgents(html() + extra), /expected one full benchmarkRows/);
  const components = rows(); components[0].evals[0].datasetIndexName = "different-benchmark";
  assert.throws(() => parseCodingAgents(html(components)), /changed components/);
  const weight = rows(); weight[0].evals[0].weight = 0.5;
  assert.throws(() => parseCodingAgents(html(weight)), /invalid component/);
  const score = rows(); score[0].evals[0].mean.reward = 1.5;
  assert.throws(() => parseCodingAgents(html(score)), /invalid component/);
});

test("failed live fetch or partial parse never overwrites the previous snapshot", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aa-coding-test-"));
  const target = join(dir, "snapshot.json");
  const original = JSON.stringify({ version: "1.5", count: 13, previous: "retain byte for byte" });
  try {
    await writeFile(target, original);
    await assert.rejects(refreshCodingAgents({ target, html: html(rows().slice(1)) }), /incomplete/);
    assert.equal(await readFile(target, "utf8"), original);
    // Every raw source uses the same writer; serialization failure preserves it too.
    const circular = {}; circular.self = circular;
    await assert.rejects(writeJSONAtomic(target, circular), /circular/);
    assert.equal(await readFile(target, "utf8"), original);
    await assert.rejects(refreshCodingAgents({ target, fetcher: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
    assert.equal(await readFile(target, "utf8"), original);
    await refreshCodingAgents({ target, html: html() });
    assert.equal(JSON.parse(await readFile(target, "utf8")).count, 13);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("metadata parsing does not depend on first key or erase escaped quotes", () => {
  const record = `f:${JSON.stringify({ models: [{ name: 'A "quoted" model', id: "old-id", isOpenWeights: false }, { deprecated: false, slug: "new-slug", isOpenWeights: true }] })}\n`;
  const metadata = parseArtificialAnalysisMetadata(`<script>self.__next_f.push(${JSON.stringify([1, record])})</script>`);
  assert.equal(metadata.get("old-id").name, 'A "quoted" model');
  assert.equal(metadata.get("new-slug").isOpenWeights, true);
});
