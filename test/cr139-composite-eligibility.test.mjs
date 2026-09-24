import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const clientSource = await readFile(new URL("../lib/client-model.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(clientSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('from "./composite.mjs"', `from "${new URL("../lib/composite.mjs", import.meta.url).href}"`)
  .replace('from "./family-representative.mjs"', `from "${new URL("../lib/family-representative.mjs", import.meta.url).href}"`);
const { hasScoreEvidence, scoreWithEvidence } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [detail, api, explorer, provider, compare, chart, shortlist, variants, pageData] = await Promise.all([
  read("../app/models/[id]/page.tsx"), read("../app/api/models/route.ts"),
  read("../components/ModelExplorer.tsx"), read("../components/ProviderExplorer.tsx"),
  read("../components/CompareView.tsx"), read("../components/BenchmarkMatrix.tsx"),
  read("../lib/top-models.ts"), read("../lib/variants.ts"), read("../lib/page-data.ts"),
]);

const attachedOnly = { composite_coverage: 0, composite_attached: 2, scores: { composite: 83.2 } };
const exactAndAttached = { composite_coverage: 1, composite_attached: 2, scores: { composite: 83.2 } };

test("CR-139.4: attached-only family evidence cannot qualify a Composite score", () => {
  assert.equal(hasScoreEvidence(attachedOnly, "composite"), false);
  assert.equal(scoreWithEvidence(attachedOnly, "composite"), null);
  assert.equal(hasScoreEvidence(exactAndAttached, "composite"), true);
  assert.equal(scoreWithEvidence(exactAndAttached, "composite"), 83.2);
  assert.equal(hasScoreEvidence({ composite_coverage: 0, scores: { aa_coding_index: 12 } }, "aa_coding_index"), true);
});

test("CR-139.4: every Composite score consumer uses the shared exact-evidence predicate", () => {
  assert.match(detail, /hasScoreEvidence\(clientModel, "composite"\)/);
  assert.match(api, /scoreWithEvidence\(client, score\)/);
  assert.match(api, /compositeEligible \? client\?\.composite_raw \?\? null : null/);
  assert.match(explorer, /hasScoreEvidence\(m, "composite"\)/);
  assert.match(provider, /s\.score === "composite" && !hasScoreEvidence\(model, s\.score\)/);
  assert.match(compare, /s\.score === "composite"\) r = r\.filter\(\(m\) => hasScoreEvidence\(m, "composite"\)\)/);
  assert.match(chart, /v != null && hasScoreEvidence\(m!, key\)/);
  assert.match(shortlist, /hasScoreEvidence\(m as unknown as ClientModel, s\.score\)/);
  assert.match(variants, /hasScoreEvidence\(row, score\)/);
  assert.match(pageData, /hasScoreEvidence\(shown, "composite"\)/);
});
