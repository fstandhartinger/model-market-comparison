#!/usr/bin/env node
// Freezes the self-reported candidates as a critic artifact and builds the review packet.
// Usage: node ops/ux-2026-09-12/bin/self-reported-critic-packet.mjs <artifact.json> <packet.md> [i/n] [ids.json]
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { writeJSONAtomic } from '../../../lib/snapshot.mjs';
import { flattenHtmlTables, documentLines } from '../../../lib/self-reported-vendor.mjs';

const [artifactPath, packetPath, slice, idsFile] = process.argv.slice(2);
if (!artifactPath || !packetPath) throw new Error('usage: <artifact.json> <packet.md> [i/n] [ids.json]');
const read = async (p) => JSON.parse(await readFile(p, 'utf8'));
// An id list re-reviews exactly the candidates a previous round left unresolved.
const only = idsFile ? new Set(await read(idsFile)) : null;
const all = (await read('data/raw/benchmarks/self-reported-candidates.json')).observations
  .filter((o) => !only || only.has(o.id));
const registry = await read('data/raw/benchmarks/registry.json');
// The critic must be able to read the table itself, not a summary of it: every candidate is shown
// with the printed lines above its row, exactly as the captured document prints them.
const captures = new Map();
for (const receipt of await read('data/raw/benchmarks/self-reported/2026-09-16/manifest.json')) {
  if (receipt.status === 200) captures.set(receipt.url, documentLines(flattenHtmlTables(gunzipSync(await readFile(receipt.file)).toString('utf8'))));
}
function context(o, line, headerLine) {
  const lines = captures.get(o.source.url);
  if (!lines) return null;
  const at = lines.findIndex((l) => l.line.trim() === line.trim());
  if (at < 0) return null;
  const block = [];
  for (let i = Math.max(0, at - 8); i <= at; i++) if (lines[i].line.trim() && lines[i].page === lines[at].page) block.push(lines[i].line.replace(/\s+$/, ''));
  const near = block.slice(-7);
  // The header of a folded HTML table is often further above than the block reaches; without it the
  // column claim cannot be checked at all, so it is always shown.
  if (headerLine && !near.some((l) => l.trim() === headerLine.trim())) near.unshift(headerLine, '…');
  return near.join('\n');
}
const entries = new Map(registry.entries.map((e) => [e.id, e]));

// A critic that has to answer about fifty rows at once runs out of completion budget before it
// finishes the list, so a tranche is reviewed in slices. Each slice is its own frozen artifact.
const [index, count] = slice ? slice.split('/').map(Number) : [1, 1];
if (!(index >= 1 && index <= count)) throw new Error('slice must be i/n with 1 <= i <= n');
const size = Math.ceil(all.length / count);
const candidates = { observations: all.slice((index - 1) * size, index * size) };

await writeJSONAtomic(artifactPath, { schema_version: 1, observations: candidates.observations });
const artifactSha = createHash('sha256').update(await readFile(artifactPath)).digest('hex');

let s = `# Self-reported vendor scores — candidate review (tranche A, 2026-09-16)\n\n`;
s += `artifact_id: self-reported-tranche-a-slice-${index}-of-${count}\nartifact_sha256: ${artifactSha}\n\n`;
s += `These are benchmark numbers that model labs published about their own models in release documents\n`;
s += `(system cards, model cards, technical reports). They will be stored as \`basis: self_reported\`, are\n`;
s += `never part of any composite score, and are shown in the product marked as reported by the developer.\n\n`;
s += `Each candidate below was machine-verified against our own capture of the primary document: the\n`;
s += `"document line" is the line of the captured document the value was found in, together with the other\n`;
s += `values the same published row contains.\n\n`;
s += `## What to check, per candidate\n\n`;
s += `1. The **value** appears in the document line.\n`;
s += `2. The **benchmark identity** is right: the printed benchmark name is the same benchmark and the\n`;
s += `   same version as the registry entry named for it, and the registry unit matches the printed\n`;
s += `   unit. Capitalisation and hyphenation may differ between a document and the registry name\n`;
s += `   ("SWE-Bench" / "SWE-bench"); that is not a finding.\n`;
s += `3. The **column** is this model's: compare the "header line" with the "document line" using the\n`;
s += `   stated column position, and confirm the value sits under the named model, not a neighbour.\n`;
s += `   A cell table aligns from the right, because the row carries one extra leading cell with the\n`;
s += `   benchmark name; a PDF layout table aligns on character columns. Where there is no header\n`;
s += `   line, the row or sentence names the model itself.\n`;
s += `4. \`basis\` is \`self_reported\` and \`comparison_key\` is \`null\` on every row.\n\n`;
s += `## Candidates (${candidates.observations.length})\n\n`;
for (const o of candidates.observations) {
  const e = entries.get(o.benchmark_id);
  const line = (o.source.locator.split('matched line: ')[1] ?? '').split('; column header: ')[0];
  s += `### ${o.id}\n`;
  s += `- registry: \`${o.benchmark_id}\` — ${e.name} (${e.category}); unit ${e.scoring.unit}; metric: ${e.scoring.metric}\n`;
  s += `- model as printed: ${o.subject.name}; catalog configuration: ${o.subject.model_id ?? 'not matched (kept as an unmatched source identity)'}\n`;
  s += `- value: ${o.value} ${o.unit}; basis ${o.basis}; comparison_key ${JSON.stringify(o.comparison_key)}\n`;
  s += `- source: ${o.source.url}\n`;
  s += `- document line: \`${line.replace(/`/g, "'")}\`\n`;
  s += `- column: ${(o.protocol.split('re-verified against our own capture: ')[1] ?? '').replace(/`/g, "'")}\n`;
  // A cell table's alignment is easy to miscount by hand, so the packet pairs the columns explicitly.
  const headerLine = (o.source.locator.split('column header: ')[1] ?? '').split(' (cell ')[0];
  if (headerLine.includes('|') && line.includes('|')) {
    const names = headerLine.split('|').map((c) => c.trim()).filter(Boolean);
    const values = line.split('|').map((c) => c.trim()).filter(Boolean);
    const pairs = names.map((name, i) => `${name} = ${values[values.length - names.length + i] ?? '—'}`);
    s += `- the columns, aligned from the right: ${pairs.join('; ')}\n`;
  }
  const shared = o.protocol.split('the document prints one column, ')[1];
  if (shared) s += `- note recorded on the value: the document prints one column, ${shared.split('", for')[0]}", for more than one product\n`;
  const block = context(o, line, headerLine);
  if (block) s += `- the captured document, the lines above the row and the row itself:\n\n\`\`\`\n${block.replace(/```/g, "'''")}\n\`\`\`\n`;
  s += `- protocol: ${o.protocol}\n\n`;
}
s += `## Required answer\n\nReturn only this JSON object:\n\n`;
s += '```json\n{\n  "artifact_id": "self-reported-tranche-a-slice-'+index+'-of-'+count+'",\n  "artifact_sha256": "' + artifactSha + '",\n';
s += '  "round": 1,\n  "verdict": "pass" | "revise",\n  "errors_found": <integer>,\n';
s += '  "findings": [{"id": "<candidate id>", "severity": "major"|"minor", "problem": "..."}],\n';
s += '  "fixed": [],\n  "uncertainties": [],\n  "missing_evidence": [],\n';
s += '  "coverage_checked": [<every candidate id you checked>]\n}\n```\n\n';
s += `The "comparison values" counted in the column line are the other models' values **that the\n`;
s += `extraction recorded** for that row. An extraction routinely records only some of the columns, so\n`;
s += `this count is normally smaller than the number of cells in the row. It is not a cell count.\n\n`;
s += `\`verdict\` is \`pass\` only when \`findings\` is empty and \`errors_found\` is 0. List every candidate id you\n`;
s += `checked in \`coverage_checked\`; a candidate you did not check must not appear there.\n`;
await writeFile(packetPath, s);
console.log(JSON.stringify({ artifact: artifactPath, artifact_sha256: artifactSha, packet: packetPath, candidates: candidates.observations.length }));
