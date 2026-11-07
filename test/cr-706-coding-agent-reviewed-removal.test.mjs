// CR-706 (2026-11-07): AA dropped one Coding Agent v2.0 row (Mistral Vibe - Mistral Large 4 (High)). A shrink still
// fails closed; only an unexpired owner-reviewed approval bound to the exact previous/current/removed id sets lowers
// the floor, and only by the named removals.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { CODING_AGENT_APPROVAL_KEY, codingAgentIdentityDigest, parseCodingAgents } from "../lib/aa-coding-agents.mjs";

const rows = (n) => Array.from({ length: n }, (_, i) => ({
  id: `synthetic-${i}`, display: { model: `Fixture ${i}` }, agentName: "Fixture harness", indexScore: 0.5, indexComponentCount: 3, evalCount: 3,
  evals: ["frontiercode-v1.1-main", "swe-atlas-qna", "terminal-bench-v4"].map((datasetIndexName) => ({ datasetIndexName, mean: { reward: 0.5 }, weight: 1 / 3 })),
}));
const html = (items) => {
  const records = `a:${JSON.stringify(["$", "div", null, { rows: items }])}\nb:${JSON.stringify({ title: "Performance", description: "Performance across the Artificial Analysis Coding Agent Index.", change: { description: "Coding Agent Index v2.0:" }, benchmarkRows: items.map((_, i) => `$a:props:rows:${i}`) })}\n`;
  return `<script>self.__next_f.push(${JSON.stringify([1, records])})</script>`;
};
const previous = parseCodingAgents(html(rows(15)));
const current = rows(15).filter((row) => row.id !== "synthetic-3");
const now = Date.parse("2026-11-07T02:00:00Z");
const approval = (over = {}) => ({
  version: "2.0", removed: ["synthetic-3"], reviewed_at: "2026-11-07T01:37:00Z", expires_at: "2026-11-10T01:30:00Z",
  previous_identity_sha256: codingAgentIdentityDigest(previous.rows.map((r) => r.source_id)),
  current_identity_sha256: codingAgentIdentityDigest(current.map((r) => r.id)), ...over,
});

test("CR-706: an exact unexpired approval accepts the named removal and records it", () => {
  assert.throws(() => parseCodingAgents(html(current), previous, { now }), /incomplete scrape: 14 rows \(minimum 15\)/);
  const parsed = parseCodingAgents(html(current), previous, { approval: approval(), now });
  assert.equal(parsed.count, 14);
  assert.deepEqual(parsed.reviewed_removal.removed, ["synthetic-3"]);
  assert.deepEqual(parsed.reviewed_removal.removed_rows, previous.rows.filter((r) => r.source_id === "synthetic-3"));
});

test("CR-706: expired, overlong, mismatched or broader removals keep the floor", () => {
  const bad = [
    approval({ expires_at: "2026-11-07T01:59:00Z" }),
    approval({ reviewed_at: "2026-11-06T00:00:00Z" }),
    approval({ reviewed_at: "2026-11-07T03:00:00Z" }),
    approval({ version: "1.5" }),
    approval({ removed: ["synthetic-4"] }),
    approval({ removed: ["synthetic-3", "synthetic-4"] }),
    approval({ previous_identity_sha256: "0".repeat(64) }),
    approval({ current_identity_sha256: "0".repeat(64) }),
  ];
  for (const a of bad) assert.throws(() => parseCodingAgents(html(current), previous, { approval: a, now }), /incomplete scrape/);
  // A second, unnamed absence fails even though the named one is approved.
  const two = current.filter((row) => row.id !== "synthetic-7");
  assert.throws(() => parseCodingAgents(html(two), previous, { approval: approval({ current_identity_sha256: codingAgentIdentityDigest(two.map((r) => r.id)) }), now }), /incomplete scrape/);
});

test("CR-706: the committed approval binds the retained 2026-11-07 capture", async () => {
  const approvals = JSON.parse(await readFile(new URL("../data/raw/source-change-approvals.json", import.meta.url), "utf8"));
  const a = approvals[CODING_AGENT_APPROVAL_KEY];
  assert.equal(CODING_AGENT_APPROVAL_KEY, "aa_coding_agents_v2_0");
  assert.deepEqual(a.removed, ["9fcf1e000a8ac75cca614977bcac25da"]);
  assert.ok(Date.parse(a.expires_at) - Date.parse(a.reviewed_at) <= 3 * 86400000);
  const bytes = gunzipSync(await readFile(new URL(`../${a.evidence_file}`, import.meta.url)));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), a.primary_capture_sha256);
  const parsed = parseCodingAgents(bytes.toString("utf8"), null);
  assert.equal(parsed.count, 33);
  assert.equal(codingAgentIdentityDigest(parsed.rows.map((r) => r.source_id)), a.current_identity_sha256);
  const vibe = parsed.rows.find((r) => r.source_id === "730b8ffd93e83875305984c999467c69");
  assert.equal(vibe.model_name, "Mistral Large 4 (High)");
  assert.ok(Math.abs(vibe.score - 0.354072051699794) < 1e-12);
});
