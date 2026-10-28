import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {jevScopeClassifier,jevbenchScopeArtifact} from '../../lib/jevbench-scope.mjs';
import {jevLiveAllArtifact} from '../../lib/jevbench-cohort-merge.mjs';
import {projectJevbenchFeed} from '../../lib/jevbench-agent-feed.mjs';
import {readJevbenchV1718ForBoard} from '../../lib/jevbench-v1718-release.mjs';
const J=new URL('.',import.meta.url).pathname,V='data/raw/benchmarks/jevbench/v1.7/',load=v=>JSON.parse(readFileSync(V+`jevbench-v1.7.${v}-results.json`)),before=load(17),after=load(18),actual=JSON.parse(readFileSync(J+'receipts/visibility-pass.json'));
const carry=JSON.parse(readFileSync(V+'jevbench-v1.7.17-carry.json')),keys=after.addendum.new_keys,old=new Map(before.systems.map(s=>[s.key,s]));
assert.equal(actual.restated_by,'v1.7.18');assert.equal(actual.latest_release,'v1.7.18');assert.equal(Object.keys(actual.board).length,311);
for(const m of ['A','B','C','capability']){assert.deepEqual(actual.orders[m],after.board[m].order);assert.deepEqual(actual.orders[m].filter(k=>!keys.includes(k)),before.board[m].order)}
const isApi=jevScopeClassifier(before.systems,carry.rows,[],[]);
const feed=a=>projectJevbenchFeed(jevLiveAllArtifact({...a,revision:'v1.6.1'},isApi),'a'.repeat(64),{scopeArtifact:a,isApi,latestRelease:a.revision});
const b=feed(before),a=feed(after);const by=new Map(b.systems.map(s=>[s.key,s]));const changes={};
for(const s of a.systems){
 const p=by.get(s.key);if(!p)continue;
 const ranks=s=>({rank:s.rank,open_board_rank:s.open_board_rank,api_board_rank:s.api_board_rank,capability_rank:s.capability.rank,open_capability_rank:s.capability.open_board_rank,api_capability_rank:s.capability.api_board_rank});
 const x=ranks(s),y=ranks(p),diff={};for(const f of Object.keys(x))if(x[f]!==y[f])diff[f]={before:y[f],after:x[f]};if(Object.keys(diff).length)changes[s.key]=diff;
 const actualFeed=actual.feed[s.key];for(const f of ['rank','open_board_rank','api_board_rank','capability_rank','open_capability_rank'])assert.equal(actualFeed[f],x[f],s.key+' '+f);
 for(const f of ['axes','composite_score','price','ranked','listing','not_ranked_because'])assert.deepEqual(s[f],p[f],s.key+' '+f);
}
for(const k of keys){assert.ok(actual.scopes.open.includes(k));assert.ok(!actual.scopes.api.includes(k));assert.ok(actual.feed[k]?.ranked);assert.ok(Number.isInteger(actual.feed[k].rank));}
assert.equal(await readJevbenchV1718ForBoard(),null,'real candidate remains hidden');
const proof=JSON.parse(readFileSync(V+'jevbench-v1.7.18-proof.json'));
const pinned=Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([f,x])=>[({capability_rank:'capability.rank',open_capability_rank:'capability.open_board_rank',api_capability_rank:'capability.api_board_rank'})[f]??f,x]))]));
assert.deepEqual(proof.derived_rank_exceptions,pinned,'runtime ranks pinned by value in proof');
writeFileSync(J+'receipts/VISIBILITY-POSTFLIP.json',JSON.stringify({status:'PASS',before_rows:309,after_rows:311,real_pending_hidden:true,scopes_correct:true,carried_score_fields_equal:true,relative_orders_unchanged:true,derived_fields:['rank','open_board_rank','api_board_rank','capability.rank','capability.open_board_rank','capability.api_board_rank'],derived_rank_changes:changes,derived_rank_change_rows:Object.keys(changes).length},null,1)+'\n');
console.log('PASS synthetic assembled board/feed 309 -> 311; correct open scope; derived feed ranks independently projected; real PENDING hidden');
