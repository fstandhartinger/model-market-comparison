import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {jevClassRows,JEV_V16_CLASS_OPTIONS} from '../../lib/jevbench-jev-class.mjs';
import {jevScopeClassifier,jevbenchScopeArtifact} from '../../lib/jevbench-scope.mjs';
const p='data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.3-results.json';
const a=JSON.parse(readFileSync(p));const b=structuredClone(a);b.systems.find(s=>s.key==='chon-1.0-e4b').cost.kind='listed';
const select=art=>{
 const api=jevScopeClassifier(art.systems,[],[],[]),r={};
 for(const scope of ['all','open','api']){
  const rows=(scope==='all'?art:jevbenchScopeArtifact(art,scope,api)).systems.filter(s=>s.ranked);
  for(const [label,opts]of [['official',{}],['none',{costFactor:Infinity,latencyFactor:Infinity}],['cost7',{costFactor:7}],['cost10',{costFactor:10}]])r[scope+'/'+label]=jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(s=>s.inClass).map(s=>s.row.key);
 }
 return r;
};
assert.deepEqual(select(a),select(b));
writeFileSync('r185/v173/receipts/F6-COST-KIND.json',JSON.stringify({decision:'relabel listed -> estimate',numeric_value_and_basis_unchanged:true,scoring_unchanged:true,view_filter_comparisons:12,equal:true,source_review:['lib/jevbench-jev-class.mjs: numeric USD and latency caps only','lib/jevbench-scope.mjs: endpoint/metadata classify API, not cost kind','components/JevCapabilityRanking.tsx: estimate label marker only','components/JevCapabilityChart.tsx: estimate label only','components/JevBenchV15Preview.tsx: label and explanatory estimate count only']},null,1)+'\n');
console.log('PASS F6: all 12 scope/cap selections unchanged; only display label/count changes');
