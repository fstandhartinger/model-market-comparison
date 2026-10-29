import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {jevScopeClassifier, jevScopeRows} from '../../lib/jevbench-scope.mjs';
const J=new URL('.',import.meta.url).pathname,L=n=>JSON.parse(readFileSync(J+'receipts/'+n)),b=L('visibility-before.json'),a=L('visibility-pass.json');
const keys=['decisionnode-flash-0.9.1-rc1','decisionnode-main-0.9.1-rc1'];assert.equal(b.restated_by,'v1.7.18');assert.equal(a.restated_by,'v1.7.19');assert.equal(a.latest_release,'v1.7.19');assert.equal(Object.keys(b.board).length,311);assert.equal(Object.keys(a.board).length,313);assert.deepEqual(a.orders,b.orders);
for(const [k,s]of Object.entries(b.board)){assert.deepEqual(a.board[k],s,k);assert.deepEqual(a.feed[k],b.feed[k],k+' feed');}
for(const k of keys){const s=a.board[k];assert.equal(s.ranked,false);assert.equal(s.listing,'unranked');assert.equal(s.rank,null);assert.equal(s.usd_per_1000,null);assert.equal(s.cost_axis,null);assert.equal(s.score_A,null);assert.ok(a.scopes.api.includes(k));checkApiClassification(a,k);assert.ok(!a.open_weights_only.includes(k));assert.ok(Object.values(s.ranks).every(v=>v===null));assert.equal(a.feed[k].open_board_rank,null);assert.equal(a.feed[k].api_board_rank,null);assert.equal(a.feed[k].capability_rank,null);assert.equal(a.feed[k].open_capability_rank,null);assert.equal(a.feed[k].rank,null);assert.equal(a.feed[k].ranked,false);}
// Exercise the same production classifier and scope filter as the release page.
function checkApiClassification(capture,k){
 const c=capture.classification[k];
 const row={key:k,v16:{lane:c.v16_lane},api_flag:c.api_flag,endpoint_kind:c.endpoint_kind};
 const isApi=jevScopeClassifier([row]);
 assert.equal(c.v16_lane,'api');assert.equal(c.api_flag,true);assert.equal(c.endpoint_kind,'api');
 assert.equal(c.is_api,true);assert.equal(isApi(row),true);
 assert.equal(jevScopeRows([row],'open',isApi).length,0);
 assert.equal(jevScopeRows([row],'api',isApi).length,1);
}
const bad=structuredClone(a);bad.classification[keys[0]]={v16_lane:'open',api_flag:false,endpoint_kind:'local',is_api:false};
assert.throws(()=>checkApiClassification(bad,keys[0]),assert.AssertionError,'open-classified new row must fail');
writeFileSync(J+'receipts/VISIBILITY-POSTFLIP.json',JSON.stringify({status:'PASS',before_rows:311,after_rows:313,carried_feed_equal:true,orders_equal:true,scope:'api',classification_negative_rejected:true,open_weights_only_excluded:true,unranked_unpriced:true},null,1)+'\n');console.log('PASS synthetic board/feed 311 -> 313; carried values and orders equal; API scope; unranked and unpriced');
