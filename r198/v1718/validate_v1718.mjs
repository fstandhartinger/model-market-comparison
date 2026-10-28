import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateJevbenchV1718Bundle,readJevbenchV1718ForBoard,V1718_NEW_KEYS} from '../../lib/jevbench-v1718-release.mjs';
import {readV1717ForV1718} from './prev_v1718.mjs';
import {validateKnowlineDecisiveness,knowlineDiagnosticUnavailable} from '../../lib/jevbench-knowline-diagnostic.mjs';
const p='data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.18-',load=n=>JSON.parse(readFileSync(p+n+'.json'));
const previous=await readV1717ForV1718();
export const bundle={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.17-publication.json')).digest('hex')};
const b=bundle,row=(x,k)=>x.artifact.systems.find(s=>s.key===k),K='knowline-26b-a4b-gen2.5';
validateJevbenchV1718Bundle(b,{candidate:true});
let rejected=0;
const neg=(name,fn)=>{const x=structuredClone(b);fn(x);try{validateJevbenchV1718Bundle(x,{candidate:true})}catch{rejected++;return}throw Error('negative accepted: '+name)};
for(const k of V1718_NEW_KEYS){
 for(const dim of ['topics','usecases'])neg(k+' fabricated '+dim,x=>{x.categories.systems[k][dim]={fake:{n:30,competence:90}}});
 for(const dim of ['families','languages'])neg(k+' missing '+dim,x=>{delete x.categories.systems[k][dim]});
 for(const part of ['The answer file was lost on 26 Oct 2026 after scoring.','These are the scores and confidence intervals computed on 23 Oct; the measurement cannot be scored again.','Subject-topic and use-case breakdowns are unavailable.'])neg(k+' missing loss text',x=>{row(x,k).disclosure=row(x,k).disclosure.replace(part,'')});
 for(const f of ['axes','composite_ci95','cost'])neg(k+' changed '+f,x=>{row(x,k)[f]={}});
 neg(k+' paid',x=>{row(x,k).paid_fast_lane=true});
 neg(k+' no disclosure',x=>{row(x,k).disclosure=''});
}
for(const f of ['decisive','decisive_rate','acc_among_decisive']){
 neg('numeric 26B '+f,x=>{row(x,K).noul_decisive[f]=f==='decisive'?299:.8});
 const s=structuredClone(row(b,K));s.noul_decisive[f]=0;try{validateKnowlineDecisiveness(s);throw Error('accepted numeric')}catch(e){if(e.message==='accepted numeric')throw e;rejected++}
}
for(const other of ['knowline-4b-gen5.5','knowline-31b-gen1']){
 neg('allowance on '+other,x=>{row(x,other).noul_decisive=structuredClone(row(x,K).noul_decisive)});
 const s={...structuredClone(row(b,K)),key:other};try{validateKnowlineDecisiveness(s);throw Error('accepted scope')}catch(e){if(e.message==='accepted scope')throw e;rejected++}
}
neg('missing Noul disclosure',x=>{row(x,K).disclosure=row(x,K).disclosure.replace(row(x,K).noul_decisive.unavailable_reason,'')});
neg('missing partial disclosure',x=>{row(x,K).disclosure=row(x,K).disclosure.replace("The measurement runner's internal time cap fired about 1.4 seconds before the scored loop ended.",'')});
neg('unsupported diagnostic',x=>{row(x,K).noul_decisive.supported=false});
neg('carried score',x=>{row(x,'knowline-31b-gen1').scores.A+=.01});
neg('carried arbitrary rank',x=>{row(x,'knowline-31b-gen1').rank++});
neg('carried rank exception',x=>{x.proof.exceptions={}});
neg('order reversed',x=>{x.artifact.board.A.order.reverse()});
neg('top five changed',x=>{x.proof.publication_approval.top_five_effect='changed'});
neg('approval hash',x=>{x.proof.topfive_diff_sha256='b'.repeat(64)});
neg('predecessor binding',x=>{x.manifest.predecessor.publication_sha256='c'.repeat(64)});
neg('raw binding',x=>{x.proof.raw_binding='rescored'});
if(!knowlineDiagnosticUnavailable(row(b,K))||knowlineDiagnosticUnavailable({...row(b,K),key:'x'}))throw Error('display scope');
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1718ForBoard()!==null)throw Error('PENDING leak');
console.log(`PASS candidate: 309 carried scores/cells equal, 255 rank changes independently recomputed and pinned; ${rejected} negatives rejected`);
