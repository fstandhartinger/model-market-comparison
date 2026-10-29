// Independently project runtime feed ranks; no raw or sealed access.
import {readFileSync} from 'node:fs';
import {jevScopeClassifier} from '../../lib/jevbench-scope.mjs';
import {jevLiveAllArtifact} from '../../lib/jevbench-cohort-merge.mjs';
import {projectJevbenchFeed} from '../../lib/jevbench-agent-feed.mjs';
const V='data/raw/benchmarks/jevbench/v1.7/',load=v=>JSON.parse(readFileSync(V+`jevbench-v1.7.${v}-results.json`)),before=load(19),after=load(20),carry=JSON.parse(readFileSync(V+'jevbench-v1.7.19-carry.json'));
const isApi=jevScopeClassifier(before.systems,carry.rows,[],[]);
// Live addenda preserve the base revision, whose near-cap precision convention is also preserved.
const feed=a=>projectJevbenchFeed(jevLiveAllArtifact({...a,revision:'v1.6.1'},isApi),'a'.repeat(64),{scopeArtifact:a,isApi,latestRelease:a.revision});
const b=new Map(feed(before).systems.map(s=>[s.key,s])),changes={};
const ranks=s=>({rank:s.rank,open_board_rank:s.open_board_rank,api_board_rank:s.api_board_rank,'capability.rank':s.capability.rank,'capability.open_board_rank':s.capability.open_board_rank,'capability.api_board_rank':s.capability.api_board_rank});
for(const s of feed(after).systems){const p=b.get(s.key);if(!p)continue;const a=ranks(s),old=ranks(p),diff={};for(const f of Object.keys(a))if(a[f]!==old[f])diff[f]={before:old[f],after:a[f]};if(Object.keys(diff).length)changes[s.key]=diff;}
console.log(JSON.stringify(changes));
