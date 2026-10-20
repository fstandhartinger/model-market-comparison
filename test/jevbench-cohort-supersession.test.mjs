import test from 'node:test';
import assert from 'node:assert/strict';
import { jevWithCohortRows } from '../lib/jevbench-cohort-merge.mjs';
const base = () => ({revision:'v1.6.1',systems:[{key:'seb-9b',ranked:false,old:true},{key:'keep',ranked:true,scores:{A:90},ranks:{capability:1},capability:90}],n_ranked:1,options:{A:{weights:{intelligence:25,calibration:25,speed:25,cost:25},intelligence_floor:0}},board:{A:{order:['keep']}}});
const cohort = (marker) => ({rows:[{row:{key:'seb-9b',ranked:true,axes:{intelligence:40,calibration:80,speed:90,cost:50},scores:{A:55},capability:60,ranks:{capability:2},...(marker===undefined?{}:{supersedes_base_row:marker})},draw:{id:'new',offset:{I:0,C:0}}}]});
test('duplicate key without an opt-in or with the wrong revision leaves the base unchanged',()=>{
 for(const marker of [undefined,'v1.6.0',null]){const a=base();assert.equal(jevWithCohortRows(a,cohort(marker)),a);}
});
test('matching opt-in replaces the base once, preserves other rows and does not mutate the archive',()=>{
 const a=base(),snapshot=structuredClone(a),m=jevWithCohortRows(a,cohort('v1.6.1'));
 assert.equal(m.systems.filter(s=>s.key==='seb-9b').length,1);assert.equal(m.systems.find(s=>s.key==='seb-9b').ranked,true);
 assert.equal(m.systems.find(s=>s.key==='keep'),a.systems[1]);assert.equal(m.n_ranked,2);assert.deepEqual(m.board.A.order,['keep','seb-9b']);assert.deepEqual(a,snapshot);
});
test('a ranked base replacement removes every old board occurrence and adjusts n_ranked',()=>{
 const a=base();a.systems[0].ranked=true;a.n_ranked=2;a.board.A.order=['seb-9b','keep','seb-9b'];
 const m=jevWithCohortRows(a,cohort('v1.6.1'));assert.equal(m.n_ranked,2);assert.equal(m.board.A.order.filter(k=>k==='seb-9b').length,1);
});
