import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import {v16CapView,v16TrafficZone,v16MeasuredLabel} from '../lib/jevbench-presentation-v16.mjs';
const require=createRequire(import.meta.url),React=require('react'),ts=require('typescript');
const {renderToStaticMarkup}=require('react-dom/server');
// Synthetic already-projected PUBLIC aggregates; not source/measurement grants.
// fixture=false below tests the presentation shape only, never artifact admission.
function fixture() {
 const rows=Array.from({length:116},(_,i) => {
  const measured=i<3,key=i===115?'fastino-gliner-2-5-decide':`synthetic-${i}`;
  return {key,display:`Synthetic ${i}`,status:measured?'current':'unmeasured',ranked:measured,
   catalogue:{},registration:i===114?null:{lane:i===2||i===115?'api':'selfhosted'},
   measurement:measured?{status:'current',measured_on:'2000-01-01',measurement_revision:'v1.6.0',method_version:'synthetic-method',model_version:'synthetic-version',model_pin:'synthetic-pin',serving:{lane:i===2?'api':'selfhosted',endpoint_condition:null}}:null,
   axes:{intelligence:measured?80:null,calibration:measured?60:null,speed:measured?100:null,cost:measured?80:null},
   composite:measured?65+i:null,capability:measured?70+i:null,headline_eligible:measured,eligibility_reasons:[],
   cost:{kind:measured?'estimate':'unpriced',usd_per_1000:measured?.1:null,basis:'Synthetic own serving estimate.',cost_rank_eligible:measured,admission_sha256:measured?'a'.repeat(64):null,
    bars:measured?[{role:'served_cost',usd_per_1000:.1,kind:'estimate',basis:'Synthetic own serving estimate.',ranking_eligible:true}]:[]},
   speed:measured?{p50_s_adjusted:.3,n:1500}:null,categories:null,language:null,
   historical_price:i===3?{kind:'estimate',usd_per_1000:.03,basis:'Old v1.5.5 method, original per1000 request-length estimate; not current billing.'}:null,
   historical_price_scenario:null};
 });
 return {revision:'v1.6.0',fixture:false,catalogue_count:116,reference:{key:'jev-1.13.0',usd_per_1000:.1,p50_s_adjusted:.3,cost_factor:2,latency_factor:2},rows,capability_order:['synthetic-2','synthetic-1','synthetic-0'],composite_order:['synthetic-2','synthetic-1','synthetic-0'],approval:null};
}
const path=new URL('../components/JevV16CapabilityAndCatalogue.tsx',import.meta.url);
const compiled=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0);
const mod=new Module(path.pathname);mod.filename=path.pathname;
mod.require=s => {
 if(['react','react/jsx-runtime'].includes(s))return require(s);
 if(['../lib/jevbench-presentation-v16.mjs','../lib/jevbench-class-caps.mjs'].includes(s))return require(new URL(s,path).pathname);
 throw new Error(`Unexpected UI test dependency ${s}`);
};
mod._compile(compiled.outputText,path.pathname);
const {JevV16CapabilityAndCatalogue}=mod.exports;
const render=p=>renderToStaticMarkup(React.createElement(JevV16CapabilityAndCatalogue,{projection:p}));
test('inclusive cap boundaries; official order ignores uncapped convenience field',()=>{
 const p=fixture();p.rows[2].cost.usd_per_1000=.2;p.rows[2].speed.p50_s_adjusted=.6;
 assert.deepEqual(v16CapView(p).eligible.map(r=>r.row.key),['synthetic-2','synthetic-1','synthetic-0']);
 p.rows[2].cost.usd_per_1000=.20001;assert.equal(v16CapView(p).eligible.length,2);
 p.rows[2].cost.usd_per_1000=.2;p.rows[2].speed.p50_s_adjusted=.60001;assert.equal(v16CapView(p).eligible.length,2);
});
test('no-cap cannot admit finite unpriced/API estimates or unlabeled admission',()=>{
 for(const patch of [{cost_rank_eligible:false},{kind:'unpriced'},{admission_sha256:null}]) {
  const p=fixture();Object.assign(p.rows[2].cost,patch);p.rows[2].headline_eligible=true;
  assert.equal(v16CapView(p,{costFactor:Infinity,latencyFactor:Infinity}).eligible.length,2);
 }
});
test('actual median required even with no latency cap; Speed axis never substitutes',()=>{
 for(const patch of [{p50_s_adjusted:null},{p50_s_adjusted:.1,n:0},{p50_s_adjusted:.1,n:true},{p50_s_adjusted:true}]) {
  const p=fixture();Object.assign(p.rows[2].speed,patch);
  assert.equal(v16CapView(p,{costFactor:Infinity,latencyFactor:Infinity}).eligible.length,2);
 }
});
test('custom caps change eligible view without mutating Composite, row metrics or frozen reference',()=>{
 const p=fixture(),before=JSON.stringify(p);p.rows[2].cost.usd_per_1000=.4;
 const official=v16CapView(p),custom=v16CapView(p,{costFactor:4,latencyFactor:2});
 assert.equal(official.eligible.length,2);assert.equal(custom.eligible.length,3);assert.equal(custom.official,false);
 p.rows[2].cost.usd_per_1000=.1;assert.equal(JSON.stringify(p),before);
});
test('full116 SSR includes unmeasured Fastino and metadata unavailable, with no invented score/date',()=>{
 const p=fixture(),html=render(p);assert.equal((html.match(/data-bh-jev16-catalogue-row=/g)??[]).length,116);
 assert.match(html,/data-bh-jev16-catalogue-row="fastino-gliner-2-5-decide"/);
 assert.match(html,/No current bound measurement/);assert.match(html,/Serving unknown/);assert.match(html,/Official 2× caps/);
 assert.equal((html.match(/type="range"/g)??[]).length,2);
 assert.match(html,/Old v1.5.5 method, original per1000 request-length estimate/);
});
test('API/base bars retain native GPU median and scenarios have no alternative score',()=>{
 const p=fixture();p.rows[0].cost.bars.push({role:'developer_api_list',usd_per_1000:.02,kind:'estimate',basis:'Synthetic API price only; GPU latency remains measured.',ranking_eligible:false});
 p.rows[0].cost.bars.push({role:'base_model_reference',usd_per_1000:.4,kind:'estimate',basis:'Synthetic base reference.',ranking_eligible:false});
 const before=JSON.stringify(p),html=render(p);assert.match(html,/data-bh-jev16-price-striped="true"/);assert.match(html,/developer_api_list/);
 assert.match(html,/no alternative score or hosted latency measured here/);assert.match(html,/0.300 s median/);assert.equal(JSON.stringify(p),before);
});
test('carry date precision and unknown day remain original, never from generation or publication',()=>{
 const p=fixture(),r=p.rows[0];r.measurement={...r.measurement,status:'carry',measurement_revision:'v1.5.5',measured_on:'1999-12-31',method_version:'old-method'};
 assert.match(v16MeasuredLabel(r),/Carried 1999-12-31 · v1.5.5 · method old-method/);
 r.measurement.measured_on=null;assert.match(v16MeasuredLabel(r),/date unknown/);assert.doesNotMatch(v16MeasuredLabel(r),/2000-01-01/);
});
test('fixtures rejected by component/default helper; explicit pure test option only',()=>{
 const p=fixture();p.fixture=true;assert.throws(()=>v16CapView(p));assert.throws(()=>render(p));assert.equal(v16CapView(p,undefined,{allowFixture:true}).rows.length,116);
});
test('bad caps/reference and missing/duplicate catalogue fail closed',()=>{
 for(const caps of [{costFactor:true,latencyFactor:2},{costFactor:NaN,latencyFactor:2},{costFactor:0,latencyFactor:2}])assert.throws(()=>v16CapView(fixture(),caps));
 for(const edit of [p=>p.rows.pop(),p=>p.rows[115]=p.rows[114],p=>p.reference.cost_factor=3,p=>p.reference.p50_s_adjusted=0]) {const p=fixture();edit(p);assert.throws(()=>v16CapView(p));}
});
test('traffic-light boundaries remain inclusive independently per cap',()=>{
 assert.equal(v16TrafficZone(1,2),'green');assert.equal(v16TrafficZone(2,2),'amber');assert.equal(v16TrafficZone(2.1,2),'red');assert.equal(v16TrafficZone(99,Infinity),'amber');assert.equal(v16TrafficZone(null,2),'unknown');
});
test('no release route or existing page adopts prepared component/fixtures',()=>{
 for(const rel of ['../app/jev-models/page.tsx','../components/JevBenchV15ReleasePage.tsx','../components/JevBenchV15Preview.tsx'])assert.doesNotMatch(fs.readFileSync(new URL(rel,import.meta.url),'utf8'),/JevV16CapabilityAndCatalogue|jevbench-presentation-v16/);
});
