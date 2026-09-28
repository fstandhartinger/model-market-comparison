// Fable pass 41 (2026-09-28) source pins — F-218: hashes in the v1.5 preview's prose print as a 12-character prefix with the full value in
// the title (the hub's convention), the provenance line keeps the full values once, and every hash is read from the artifact (no literal).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../components/JevBenchV15Preview.tsx', import.meta.url), 'utf8');

test('F-218: no 64-hex literal lives in the preview component — every hash comes from the artifact', () => {
  assert.doesNotMatch(component, /[0-9a-f]{64}/, 'a hash literal in a component outlives the artifact revision it was copied from');
  assert.match(component, /<Sha v=\{a\.pricing_disclosure_correction_sha256\} \/>/, 'the pricing-correction hash is the artifact field');
});

test('F-218: the four prose hashes render through Sha (prefix + title); the provenance line keeps the two full values', () => {
  assert.match(component, /const Sha = \(\{ v, id \}[^\n]*<code title=\{v\}[^\n]*\{v\.slice\(0, 12\)\}…<\/code>/, 'Sha prints v.slice(0, 12)… with the full value in title');
  assert.match(component, /<Sha v=\{a\.method_sha256\} id="method" \/>/);
  assert.match(component, /<Sha v=\{a\.pricing_addendum_sha256\} \/>/);
  assert.match(component, /<Sha v=\{a\.headline_method_addendum_sha256\} \/>/);
  assert.equal(component.split('<Sha ').length - 1, 4, 'exactly four prose hashes');
  const prov = component.match(/data-bh-jev15-provenance>[^\n]*<\/p>/);
  assert.ok(prov, 'the provenance line exists');
  assert.equal(prov[0].split('break-all').length - 1, 2, 'the provenance line carries the two full hashes');
  assert.equal(component.split('break-all').length - 1, 2, 'no other full hash is printed in the component');
  assert.match(component, /data-bh-jev15-method-sha=\{id === 'method' \? '' : undefined\}/, 'the method hash keeps its marker attribute');
});
