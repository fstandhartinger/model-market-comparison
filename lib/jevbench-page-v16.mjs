/** Complete v16 page assembly from public aggregate BYTES supplied by the
 * authenticated server parent. No filesystem/network/adoption authority. */
import { projectJevV16Registry, canonicalV16Aggregate } from './jevbench-registry-v16.mjs';
import { v16CapView } from './jevbench-presentation-v16.mjs';
const refuse=()=>{throw new Error('Complete v1.6 page public contracts unavailable.');};
const need=x=>{if(!x)refuse();};
const number=x=>typeof x==='number'&&Number.isFinite(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=4000;
const unicode=s=>!/[\uD800-\uDFFF]/u.test(s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,''));
const day=x=>typeof x==='string'&&/^[1-9]\d{3}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>canonicalV16Aggregate(a)===canonicalV16Aggregate(b);
function strictJSON(raw) {
  let i = 0;
  const ws = () => { while (/[\t\r\n ]/.test(raw[i] ?? '') && i < raw.length) i++; };
  const string = () => {
    const start = i++; let escaped = false;
    while (i < raw.length) {
      const c = raw[i++];
      if (!escaped && c === '"') { let out; try { out = JSON.parse(raw.slice(start, i)); } catch { refuse(); } need(unicode(out)); return out; }
      if (!escaped && c === '\\') escaped = true; else escaped = false;
    }
    refuse();
  };
  const value = (depth) => {
    need(depth < 100); ws(); const c = raw[i];
    if (c === '"') return string();
    if (c === '{') {
      i++; ws(); const out = Object.create(null);
      if (raw[i] === '}') { i++; return out; }
      while (true) {
        need(raw[i] === '"'); const k = string(); need(!Object.hasOwn(out, k)); ws(); need(raw[i++] === ':');
        out[k] = value(depth + 1); ws(); const sep = raw[i++]; if (sep === '}') return out; need(sep === ','); ws();
      }
    }
    if (c === '[') {
      i++; ws(); const out = []; if (raw[i] === ']') { i++; return out; }
      while (true) { out.push(value(depth + 1)); ws(); const sep = raw[i++]; if (sep === ']') return out; need(sep === ','); }
    }
    for (const [literal, v] of [['null', null], ['true', true], ['false', false]]) if (raw.startsWith(literal, i)) { i += literal.length; return v; }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(raw.slice(i)); need(match); i += match[0].length; const n = Number(match[0]); need(number(n)); return n;
  };
  const result = value(0); ws(); need(i === raw.length); return result;
}

async function bytes(stored,expected) {
 need(stored&&typeof stored.raw==='string'&&stored.raw.length>0&&stored.raw.length<=16*1024*1024&&hash(expected)&&stored.sha256===expected&&unicode(stored.raw));
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stored.raw));
 need([...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')===expected);
 return strictJSON(stored.raw);
}
function categories(profile,row,descriptors,today) {
 need(record(profile)&&['current','carry'].includes(profile.kind)&&profile.kind===row.status&&profile.model_version===row.measurement.model_version&&profile.model_pin===row.measurement.model_pin&&profile.main_measured_on===row.measurement.measured_on);
 need(day(profile.measured_on)&&profile.measured_on<=today&&text(profile.revision)&&text(profile.metric)&&text(profile.scope)&&profile.equated===false&&hash(profile.source_sha256));
 if(profile.kind==='current')need(profile.revision==='v1.6.0'&&profile.measured_on===row.measurement.measured_on&&profile.scope===(row.measurement.serving.lane==='api'?'A300+P300':'S1200+P300')&&row.categories?.kind==='current'&&same(profile.topics,row.categories.topics)&&same(profile.usecases,row.categories.usecases));
 else need(profile.revision!=='v1.6.0'&&profile.measured_on===row.measurement.measured_on);
 for(const kind of ['topics','usecases']) {
  need(record(profile[kind])&&Object.keys(profile[kind]).length===descriptors[kind].length);
  for(const d of descriptors[kind]){const cell=profile[kind][d.key];need(cell&&Number.isSafeInteger(cell.n)&&cell.n>=0&&typeof cell.low_n==='boolean'&&(cell.competence===null||number(cell.competence)));if(cell.n===0)need(cell.competence===null);}
 }
 return profile;
}
/** Structural validation only. Genuine source/runtime/release admission is the
 * parent trust boundary; hashes never constitute that approval. */
export function assembleV16Page(projection,manifest,profiles,{allowFixture=false}={}) {
 need(manifest?.kind==='jevbench-v16-page'&&manifest.schema_version===1&&manifest.fixture===projection.fixture&&(!manifest.fixture||allowFixture));
 v16CapView(projection,undefined,{allowFixture});
 need(day(manifest.generated_on)&&same(manifest.projection_hashes,projection.source_hashes));
 need(Array.isArray(manifest.expected_catalogue_keys)&&new Set(manifest.expected_catalogue_keys).size===116&&same([...manifest.expected_catalogue_keys].sort(),projection.rows.map(x=>x.key).sort()));
 const ranked=projection.rows.filter(x=>x.ranked),keys=ranked.map(x=>x.key).sort();
 need(record(profiles)&&same(Object.keys(profiles).sort(),keys));
 const boundProfiles=Object.fromEntries(ranked.map(row=>[row.key,categories(profiles[row.key],row,projection.category_descriptors,manifest.generated_on)]));
 for(const row of ranked){need(row.language&&row.language.model_version===row.measurement.model_version);}
 need(Array.isArray(manifest.method)&&manifest.method.length>=6&&manifest.method.every(text));
 need(record(manifest.rotation)&&Number.isSafeInteger(manifest.rotation.sealed_release_count)&&manifest.rotation.sealed_release_count>0&&Number.isSafeInteger(manifest.rotation.sealed_reserve_count)&&manifest.rotation.sealed_reserve_count>=manifest.rotation.sealed_release_count&&Number.isSafeInteger(manifest.rotation.retire_after_uses)&&manifest.rotation.retire_after_uses>0&&Number.isSafeInteger(manifest.rotation.api_every_n_releases)&&manifest.rotation.api_every_n_releases>0&&text(manifest.rotation.disclosure));
 need(Array.isArray(manifest.scenarios)&&manifest.scenarios.length>0&&text(manifest.official_scenario)&&hash(manifest.whatif_scorer_sha256));
 const scenarioIds=new Set();
 for(const s of manifest.scenarios){need(text(s.id)&&!scenarioIds.has(s.id)&&text(s.label)&&hash(s.source_sha256)&&s.scorer_sha256===manifest.whatif_scorer_sha256&&record(s.weights)&&same(Object.keys(s.weights).sort(),['calibration','cost','intelligence','speed'])&&Object.values(s.weights).every(x=>number(x)&&x>=0)&&Object.values(s.weights).reduce((a,b)=>a+b,0)>0&&record(s.scores)&&same(Object.keys(s.scores).sort(),keys)&&Object.values(s.scores).every(x=>number(x)&&x>=0&&x<=100));scenarioIds.add(s.id);}
 const official=manifest.scenarios.find(x=>x.id===manifest.official_scenario);need(official&&ranked.every(row=>official.scores[row.key]===row.composite));
 need(Array.isArray(manifest.revisions)&&manifest.revisions.length>0&&manifest.revisions.every(x=>text(x.revision)&&day(x.measured_on)&&x.measured_on<=manifest.generated_on&&text(x.summary)&&hash(x.source_sha256)&&typeof x.href==='string'&&/^\/benchmarks\/jevbench(?:\/|$)/.test(x.href)));
 return structuredClone({projection,manifest,profiles:boundProfiles});
}
/** Fixed server loader contract; caller supplies already adopted PUBLIC bytes
 * and expected hashes from actual parent authenticated release binding. No
 * read path, dynamic importer, callback scorer, protected or fallback IO. */
export async function loadJevV16Page({projectionInput,pageManifest,categoryProfiles,expected},{allowFixture=false}={}) {
 need(record(expected)&&same(Object.keys(expected).sort(),['as_of','categoryProfiles','pageManifest','projection'])&&record(expected.projection));
 for(const k of ['registry','release','bindings','categories','languages'])need(hash(expected.projection[k])&&projectionInput[k].sha256===expected.projection[k]);
 const manifest=await bytes(pageManifest,expected.pageManifest),profiles=await bytes(categoryProfiles,expected.categoryProfiles);
 need(day(expected.as_of)&&manifest.generated_on<=expected.as_of&&manifest.category_profiles_sha256===expected.categoryProfiles);
 const projection=await projectJevV16Registry(projectionInput,{allowFixture});
 return assembleV16Page(projection,manifest,profiles,{allowFixture});
}
