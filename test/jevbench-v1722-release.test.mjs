import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateJevbenchV1722Bundle,readJevbenchV1722ForBoard,V1722_NEW_KEYS} from '../lib/jevbench-v1722-release.mjs';
import {readV1721ForV1722} from '../r198/v1722/prev_v1722.mjs';
import {checkNewRowText,checkUnrankedRow} from '../r198/v1722/row_gates_v1722.mjs';
const p='data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-';
const load=n=>JSON.parse(readFileSync(p+n+'.json'));
const previous=await readV1721ForV1722();
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.21-publication.json')).digest('hex')};
const k='umpire-35b-a3b';const s=b.artifact.systems.find(s=>s.key===k);
test('v1.7.22 candidate validates against the pinned predecessor',()=>assert.equal(validateJevbenchV1722Bundle(b,{candidate:true}),true));
test('all 315 carried rows and their cells are equal',()=>{for(const r of previous.artifact.systems){assert.deepEqual(b.artifact.systems.find(s=>s.key===r.key),r);assert.deepEqual(b.categories.systems[r.key],previous.categories.systems[r.key]);}assert.deepEqual(b.artifact.board,previous.artifact.board);});
test('Umpire 35B-A3B is a self-hosted unranked full-draw row',()=>{assert.deepEqual(V1722_NEW_KEYS,[k]);assert.equal(s.endpoint_kind,'gpu');assert.equal(s.api_flag,false);checkUnrankedRow(s,b.artifact.board);assert.equal(s.status.rows,1500);assert.equal(s.status.answered_ok,1495);assert.equal(s.v16.n_items,1500);});
test('same-items basis is unchanged is frozen',()=>{assert.equal(b.proof.cost_basis.n_items,1489);assert.equal(b.proof.cost_basis.set_sha256,'4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537');assert.equal(Object.keys(b.proof.cost_basis.per_row_membership).length,11);assert.deepEqual(b.proof.exceptions,{});assert.deepEqual(b.artifact.addendum.repriced_keys,[]);});
test('native zero output and the size/architecture-class reference determine estimate cost',()=>{const c=b.proof.new_rows[k].cost,r=b.proof.new_rows[k].price_reference;assert.equal(r.in,.3125);assert.equal(r.out,1.25);assert.equal(c.output_tokens,0);assert.equal(s.cost.kind,'estimate');assert.ok(Math.abs(s.cost.usd_per_1000-1000*c.input_tokens_common*.3125/1e6/1489)<1e-15);});
test('all training, serving, limit and token disclosures are required',()=>{checkNewRowText(s);const x=structuredClone(s);x.disclosure=x.disclosure.replace('Training data were not inspected','');assert.throws(()=>checkNewRowText(x));});
test('old stronger-than-anchor note is refused',()=>{const x=structuredClone(s);x.not_ranked_because=b.artifact.systems.find(s=>s.key==='jeff_1_1_large').not_ranked_because;assert.throws(()=>checkUnrankedRow(x,b.artifact.board));});
test('PENDING is hidden; synthetic PASS exposes the validated release',async()=>{const r=await readJevbenchV1722ForBoard();if(b.manifest.review.verdict==='PENDING')assert.equal(r,null);else assert.equal(r.artifact.revision,'v1.7.22');});
test('draw remains unequated and topic cells stay absent',()=>{assert.equal(s.draw.status,'anchor-runs-pending');assert.deepEqual(s.draw.offset,{I:0,C:0});assert.equal(b.categories.systems[k].topics,undefined);});

test('release page shows exactly the measurement notes added since v1.7.21',()=>{
 const page=readFileSync('app/jev-models/v1.7.22/page.tsx','utf8');
 const check=text=>{
  const match=text.match(/measurement_notes\.slice\((-?\d+)\)/);
  assert.ok(match,'page must select its release notes');
  const notes=b.artifact.measurement_notes.slice(Number(match[1]));
  const added=b.artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  assert.equal(added.length,1);
  assert.deepEqual(notes,added);
  assert.match(notes.join(' '),/Umpire/);
  assert.doesNotMatch(notes.join(' '),/VisionJEV|Lychee/i);
 };
 check(page);
 assert.throws(()=>check(page.replace('measurement_notes.slice(-1)','measurement_notes.slice(-2)')));
});
