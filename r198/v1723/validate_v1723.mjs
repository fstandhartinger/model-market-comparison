import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readV1722ForV1723} from './prev_v1723.mjs';
const root=path.resolve(process.argv[2]??process.cwd()),imp=p=>import(pathToFileURL(path.join(root,p)));
const {validateJevbenchV1723Bundle,readJevbenchV1723ForBoard,V1723_PUBLIC_LEAK}=await imp('lib/jevbench-v1723-release.mjs');
const D='data/raw/benchmarks/jevbench/v1.7/';
const load=n=>JSON.parse(readFileSync(path.join(root,`${D}jevbench-v1.7.23-${n}.json`)));
const previous=await readV1722ForV1723(root);
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),history:load('history'),historyCarry:load('history-carry'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,D+'jevbench-v1.7.22-publication.json'))).digest('hex')};
validateJevbenchV1723Bundle(b,{candidate:true});
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k);
let rejected=0;
const expectReject=(name,fn)=>{const y=structuredClone(b);fn(y);let threw=false;try{validateJevbenchV1723Bundle(y,{candidate:true})}catch{threw=true}if(!threw)throw Error('negative accepted: '+name);rejected++;};
const first=(k,f)=>row(b,k)[f];
for(const [name,fn] of [
 ['leak: board ref in measurement note',x=>{x.artifact.measurement_notes[0]+=' (board #11 / #10132)'}],
 ['leak: Florian in a row text',x=>{row(x,'strike-1').underlying=(row(x,'strike-1').underlying??'')+' Florian said so.'}],
 ['leak: fast-lane order id in author',x=>{row(x,'iota-decide-4b-v0.3').author='Macrocosmos (paid fast-lane order b6b2b557, PUBLIC visibility)'}],
 ['leak: release lane in carried history',x=>{x.history=JSON.parse(JSON.stringify(x.history).replace(/:"([^"]{20,})"/,':"$1 release lane"'))}],
 ['leak: job name in history-carry',x=>{x.historyCarry=JSON.parse(JSON.stringify(x.historyCarry).replace(/:"([^"]{20,})"/,':"$1 jevbench-add-requests-20260919"'))}],
 ['number changed: score',x=>{row(x,'strike-1').scores.A+=0.01}],
 ['number changed: cost',x=>{const s=row(x,'strike-1');s.cost.usd_per_1000=(s.cost.usd_per_1000??0)+0.01}],
 ['number changed: rank',x=>{row(x,'strike-1').rank=(row(x,'strike-1').rank??0)+1}],
 ['order changed',x=>{x.artifact.board.A.order.reverse()}],
 ['category cell changed',x=>{const k=Object.keys(x.categories.systems)[0];x.categories.systems[k]=null}],
 ['old KnowLine wording',x=>{const s=row(x,'knowline-4b-gen5.5');s.disclosure=s.disclosure.replace('no earlier version of this exact model is on the board','no earlier-generation KnowLine row exists on the board')}],
 ['old DecisionNode wording',x=>{const s=row(x,'decisionnode-main-0.9.1-rc1');s.cost.basis=s.cost.basis.replace('Token usage on the fixed 1,489-item cost set: 471,195 input, 0 output (473,406 input on all 1,495 answered items).','Token usage: 471,195 input, 0 output on the answered items.')}],
 ['old over-limit v1.6.1 wording',x=>{x.artifact.measurement_notes[0]=x.artifact.measurement_notes[0]+" the FROZEN-TABLE ROW is the release lane's"}],
 ['drex-max sentence removed',x=>{const s=row(x,'drex-max');s.underlying=s.underlying.replace(/ The vendor has since updated.*$/,'')}],
 ['history sentence changed',x=>{x.artifact.measurement_notes[x.artifact.measurement_notes.length-1]+=' x'}],
 ['top five effect',x=>{x.proof.publication_approval.top_five_effect='changed'}],
 ['predecessor hash',x=>{x.manifest.predecessor.publication_sha256='c'.repeat(64)}],
 ['new row added',x=>{x.artifact.systems.push(structuredClone(x.artifact.systems[0]))}],
 ['proof exceptions emptied',x=>{x.proof.exceptions=[]}],
])expectReject(name,fn);
// the leak pattern itself
for(const t of ['board #11','#10132','Florian','jevbench-add-requests-20260919','claude:opus','release lane','deputy','custodian','CoS','paid fast-lane order b6b2b557','release owner','release-owner','this job','drafting worker','lead-reported approximation'])if(!V1723_PUBLIC_LEAK.test(t))throw Error('leak regex misses '+t);
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1723ForBoard(root)!==null)throw Error('PENDING leak');
console.log(`PASS ${previous.artifact.systems.length} carried rows equal except ${b.proof.exceptions.length} pinned text exceptions; ${rejected} negatives rejected`);
