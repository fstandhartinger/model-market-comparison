import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const J=path.dirname(new URL(import.meta.url).pathname),root=process.env.V1638_PASS||J+'/pass';process.chdir(root);
const imp=p=>import(path.join(root,p));
const {readJevbenchV161Release}=await imp('lib/jevbench-v16-release.mjs');const {readJevbenchV157Release}=await imp('lib/jevbench-v15-release.mjs');const {assembleJevBoard}=await imp('lib/jevbench-live-board.mjs');const {jevLiveAllArtifact}=await imp('lib/jevbench-cohort-merge.mjs');const {jevbenchScopeArtifact,jevScopeClassifier}=await imp('lib/jevbench-scope.mjs');
const [release,previous]=await Promise.all([readJevbenchV161Release(),readJevbenchV157Release()]);const {published,publishedCarry}=await assembleJevBoard({release,previous,live:true,apiA4:JSON.parse(readFileSync(root+'/data/jevbench-api-a4-equated.json'))});const isApi=jevScopeClassifier(published.systems,publishedCarry.rows,previous.artifact.systems,previous.artifact.not_measured);
const f=JSON.parse(readFileSync(root+'/test/fixtures/jevbench-v1637-ranks.json'));const after=JSON.parse(readFileSync(J+'/receipts/topfive-after.json'));
for(const [v,a]of Object.entries({all:jevLiveAllArtifact(published,isApi),open:jevbenchScopeArtifact(published,'open',isApi),api:jevbenchScopeArtifact(published,'api',isApi)})){
 f.views[v].ranks=Object.fromEntries(a.systems.filter(s=>s.ranked).map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]]));f.views[v].composite=Object.fromEntries(Object.entries(after.full_rankings[v].composites).map(([o,arr])=>[o,arr.map(r=>r.key)]));f.views[v].capability=Object.fromEntries(Object.entries(after.full_rankings[v].capability).map(([o,arr])=>[o,arr.map(r=>r.key)]));
}
f.revision='v1.6.38';f._about='v1.6.38 disposable PASS validation fixture; earlier release fixtures unchanged.';writeFileSync(J+'/../../test/fixtures/jevbench-v1638-ranks.json',JSON.stringify(f,null,1)+'\n');
