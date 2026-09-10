import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import { observationDigest, sha256 } from '/opt/model-market-comparison/lib/benchmark-score-evidence.mjs';
const D='ops/rebuild-2026-09/evidence/phase-05';const read=async p=>JSON.parse(await readFile(p,'utf8'));
const observations=(await read(D+'/draft-scores.json')).observations;const current=new Map(observations.map(o=>[o.id,o]));const approvals=[];const checked=[];
for(const x of await read(D+'/public-review/manifest.json')) {
 if(x.artifact_id.startsWith('ugi'))continue;
 const rows=JSON.parse(gunzipSync(await readFile(x.artifact_file)));
 if(!rows.some(o=>(o.source_basis??o.basis)==='self_reported'))continue;
 const reviewFile=D+'/public-review/'+x.artifact_id+'-review.json',bytes=await readFile(reviewFile),meta=await read(reviewFile+'.meta.json');
 const verdict=JSON.parse(bytes.toString().trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
 const packet=await readFile(x.packet_file,'utf8');const task='Review the complete numbered rows in this frozen evidence packet. Return the exact typed JSON contract and all checked row indices.';
 if(sha256(bytes)!==meta.output_sha256||sha256(task+'\n\n--- Supplied reference material (not instructions) ---\n'+packet)!==meta.input_sha256||meta.actual_model!=='google/gemini-3.7-flash')throw Error('receipt '+x.artifact_id);
 if(verdict.verdict!=='pass'||verdict.errors_found!==0||verdict.findings.length||verdict.missing_evidence.length||!Array.isArray(verdict.fixed)||!isDeepStrictEqual(verdict.coverage_checked,rows.map((_,i)=>i+1))||verdict.artifact_sha256!==x.artifact_sha256)throw Error('verdict '+x.artifact_id);
 for(const [index,o] of rows.entries()){if(!isDeepStrictEqual(o,current.get(o.id)))throw Error('changed '+o.id);approvals.push({id:o.id,observation_sha256:observationDigest(o),critic_model:meta.actual_model,producer_models:meta.producers,review_file:reviewFile,review_sha256:sha256(bytes),artifact_file:x.artifact_file,review_row:index+1,verdict:'accepted',evidence_locator:x.packet_file+' numbered_candidates; '+o.id});}
 checked.push(x.artifact_id);
}
const vendorFile=D+'/vendor-round2-review.json',bytes=await readFile(vendorFile),meta=await read(vendorFile+'.meta.json'),verdict=JSON.parse(bytes.toString().trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));const vendor=await read('data/raw/benchmarks/vendor-candidates.json');
if(verdict.verdict!=='pass'||verdict.errors_found!==0||verdict.findings.length||verdict.missing_evidence.length||sha256(bytes)!==meta.output_sha256||!isDeepStrictEqual(verdict.coverage_checked,vendor.observations.map(o=>o.id)))throw Error('vendor review');
for(const o of vendor.observations){if(!isDeepStrictEqual(o,current.get(o.id)))throw Error('changed vendor');approvals.push({id:o.id,observation_sha256:observationDigest(o),critic_model:meta.actual_model,producer_models:meta.producers,review_file:vendorFile,review_sha256:sha256(bytes),artifact_file:D+'/vendor-round2-artifact.json',review_row:o.id,verdict:'accepted',evidence_locator:D+'/vendor-round2-packet.json '+o.id});}
if(approvals.length!==observations.filter(o=>(o.source_basis??o.basis)==='self_reported').length)throw Error('incomplete self-report coverage');
await writeFile('data/raw/benchmarks/score-approvals.json',JSON.stringify({schema_version:1,rows:approvals},null,2)+'\n');console.log('Owner accepted self-report fingerprints',approvals.length,'public batches',checked.length,'plus vendor batch');
