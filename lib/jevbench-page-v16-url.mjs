/** URL presentation state only. No artifact/price/scoring/admission authority.
 * SSR uses the supplied initialSearch; browser reads occur only after mount. */
const factor=value=>value===Infinity||typeof value==='number'&&Number.isFinite(value)&&value>=1&&value<=10;
function definition(manifest){
 if(!manifest||!Array.isArray(manifest.scenarios)||!manifest.scenarios.some(s=>s.id===manifest.official_scenario))throw Error('Stored page scenarios unavailable.');
 return new Set(manifest.scenarios.map(s=>s.id));
}
function cap(value){
 if(['off','none','inf'].includes(value))return Infinity;
 if(typeof value!=='string'||!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value))return 2;
 const number=Number(value);return factor(number)?number:2;
}
function one(params,key){const values=params.getAll(key);return values.length===1?values[0]:null;}
export function normalizeV16PageView(value,manifest){
 const ids=definition(manifest);
 return {caps:{costFactor:factor(value?.caps?.costFactor)?value.caps.costFactor:2,latencyFactor:factor(value?.caps?.latencyFactor)?value.caps.latencyFactor:2},scenario:ids.has(value?.scenario)?value.scenario:manifest.official_scenario};
}
export function parseV16PageView(search,manifest){
 const params=new URLSearchParams(typeof search==='string'?search:'');
 return normalizeV16PageView({caps:{costFactor:cap(one(params,'costcap')),latencyFactor:cap(one(params,'latcap'))},scenario:one(params,'jevscenario')},manifest);
}
export function serializeV16PageView(search,value,manifest){
 const state=normalizeV16PageView(value,manifest),params=new URLSearchParams(typeof search==='string'?search:'');
 for(const [key,value]of [['costcap',state.caps.costFactor],['latcap',state.caps.latencyFactor]]){
  if(value===2)params.delete(key);else params.set(key,value===Infinity?'off':String(value));
 }
 if(state.scenario===manifest.official_scenario)params.delete('jevscenario');else params.set('jevscenario',state.scenario);
 return params.toString();
}
/** Actual browser API seam, exercised with synthetic external history objects.
 * No window lookup at module/render time; preserves unrelated query+hash. */
export function bindV16PageHistory(browser,manifest,onChange){
 let disposed=false;
 const read=()=>{if(!disposed)onChange(parseV16PageView(browser.location.search,manifest));};
 browser.addEventListener('popstate',read);read();
 return {
  update(value){if(disposed)return;const next=normalizeV16PageView(value,manifest),url=new URL(browser.location.href);url.search=serializeV16PageView(url.search,next,manifest);browser.history.replaceState(browser.history.state,'',url.toString());onChange(next);},
  dispose(){if(disposed)return;disposed=true;browser.removeEventListener('popstate',read);}
 };
}
