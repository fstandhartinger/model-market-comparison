import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const J=new URL('.',import.meta.url).pathname,L=n=>JSON.parse(readFileSync(J+'receipts/'+n)),b=L('visibility-before.json'),a=L('visibility-pass.json');
const keys=['decisionnode-flash-0.9.1-rc1','decisionnode-main-0.9.1-rc1'];assert.equal(b.restated_by,'v1.7.18');assert.equal(a.restated_by,'v1.7.19');assert.equal(a.latest_release,'v1.7.19');assert.equal(Object.keys(b.board).length,311);assert.equal(Object.keys(a.board).length,313);assert.deepEqual(a.orders,b.orders);
for(const [k,s]of Object.entries(b.board)){assert.deepEqual(a.board[k],s,k);assert.deepEqual(a.feed[k],b.feed[k],k+' feed');}
for(const k of keys){const s=a.board[k];assert.equal(s.ranked,false);assert.equal(s.listing,'unranked');assert.equal(s.rank,null);assert.equal(s.usd_per_1000,null);assert.equal(s.cost_axis,null);assert.equal(s.score_A,null);assert.ok(a.scopes.api.includes(k));assert.ok(!a.scopes.open.includes(k));assert.equal(a.feed[k].rank,null);assert.equal(a.feed[k].ranked,false);}
writeFileSync(J+'receipts/VISIBILITY-POSTFLIP.json',JSON.stringify({status:'PASS',before_rows:311,after_rows:313,carried_feed_equal:true,orders_equal:true,scope:'api',unranked_unpriced:true},null,1)+'\n');console.log('PASS synthetic board/feed 311 -> 313; carried values and orders equal; API scope; unranked and unpriced');
