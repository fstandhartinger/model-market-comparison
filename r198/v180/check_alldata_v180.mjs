import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {readJevAllDataInput} from '../../lib/jevbench-alldata-input.mjs';
const m=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-publication.json')),v=await readJevAllDataInput('v1.8.0');
if(m.review.verdict==='PENDING')assert.equal(v,null);else{assert.equal(v.artifact.revision,'v1.8.0');assert.equal(v.artifact.systems.length,316);assert.equal(v.previousKeys.length,316);assert.equal(v.live,false);}
assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.0':").length-1,1);
writeFileSync('r198/v180/receipts/ALLDATA-'+m.review.verdict+'.json',JSON.stringify({status:'PASS',review:m.review.verdict,rows:v?.artifact.systems.length??null,previous_keys:v?.previousKeys.length??null},null,1)+'\n');console.log('PASS All-data',m.review.verdict);
