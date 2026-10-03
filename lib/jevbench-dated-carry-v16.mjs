/** NEW old-method public carry shape. No IO, old-helper invocation, category
 * recomputation or authority. Authentic original lineage is the parent gate. */
import {canonicalV16Aggregate} from './jevbench-registry-v16.mjs';
const need=x=>{if(!x)throw Error('Dated old category carry unavailable.');};
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[null,Object.prototype].includes(Object.getPrototypeOf(x));
const exact=(x,keys,optional=[])=>need(record(x)&&keys.every(k=>Object.hasOwn(x,k))&&Object.keys(x).every(k=>keys.includes(k)||optional.includes(k)));
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=4000;
const key=x=>text(x)&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const count=x=>Number.isSafeInteger(x)&&x>=0;
const day=x=>typeof x==='string'&&/^[1-9]\d{3}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const same=(a,b)=>canonicalV16Aggregate(a)===canonicalV16Aggregate(b);
function cohort(c,full=false){exact(c,full?['name','n','open','sealed','membership_sha256']:['n','open','sealed']);need(['n','open','sealed'].every(k=>count(c[k]))&&c.n===c.open+c.sealed&&c.n>0);if(full)need(text(c.name)&&hash(c.membership_sha256));}
function dateEvidence(d,today){exact(d,['precision','value','timezone','source_original','origin_receipt_sha256']);need(text(d.source_original)&&hash(d.origin_receipt_sha256));if(d.precision==='calendar-day')need(day(d.value)&&['UTC','unknown'].includes(d.timezone));else{need(d.precision==='utc-instant'&&d.timezone==='UTC'&&typeof d.value==='string'&&/^[1-9]\d{3}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?Z$/.test(d.value)&&day(d.value.slice(0,10))&&Number.isFinite(Date.parse(d.value)));}need(d.value.slice(0,10)<=today);return d.value.slice(0,10);}
export function validateDatedCarryArtifact(a){
 exact(a,['kind','benchmark','revision','fixture','generated_on','public_roster_sha256','source_artifact_sha256','source_results_sha256','taxonomy_sha256','cohort_sha256','projection_source_sha256','artifact_revision','method_version','metric','labelling','rules','min_n','taxonomy','full_cohort','profiles']);
 need(a.kind==='jevbench-dated-category-carry'&&a.benchmark==='JevBench'&&a.revision==='v1.6.0'&&typeof a.fixture==='boolean'&&day(a.generated_on));
 need(text(a.artifact_revision)&&a.artifact_revision!=='v1.6.0'&&a.method_version==='v1.5-item-count-weighted-multiple-usecase'&&text(a.metric)&&text(a.labelling)&&Array.isArray(a.rules)&&a.rules.every(text)&&count(a.min_n)&&a.min_n>0);
 for(const k of ['public_roster_sha256','source_artifact_sha256','source_results_sha256','taxonomy_sha256','cohort_sha256','projection_source_sha256'])need(hash(a[k]));
 cohort(a.full_cohort,true);need(a.cohort_sha256===a.full_cohort.membership_sha256);exact(a.taxonomy,['topics','usecases']);
 const maps={};
 for(const dim of ['topics','usecases']){need(Array.isArray(a.taxonomy[dim])&&a.taxonomy[dim].length>0);const map=new Map();for(const d of a.taxonomy[dim]){exact(d,['key','label','covers','n','open','sealed'],['low_n']);need(key(d.key)&&!map.has(d.key)&&text(d.label)&&text(d.covers)&&['n','open','sealed'].every(k=>count(d[k])&&d[k]<=a.full_cohort[k])&&d.n===d.open+d.sealed);if(Object.hasOwn(d,'low_n'))need(typeof d.low_n==='boolean'&&d.low_n===(d.n<a.min_n));map.set(d.key,d);}maps[dim]=map;}
 for(const k of ['n','open','sealed'])need(a.taxonomy.topics.reduce((s,d)=>s+d[k],0)===a.full_cohort[k]);
 need(record(a.profiles));
 for(const [k,p]of Object.entries(a.profiles)){
  exact(p,['key','model_version','model_pin','measurement_revision','measurement_method_version','main_measured_on','original_model_revision','measurement_date','measurement_descriptor_sha256','origin_receipt_sha256','row_cohort','cells']);
  need(key(k)&&p.key===k&&text(p.model_version)&&text(p.model_pin)&&text(p.original_model_revision)&&text(p.measurement_revision)&&p.measurement_revision!=='v1.6.0'&&text(p.measurement_method_version)&&day(p.main_measured_on)&&dateEvidence(p.measurement_date,a.generated_on)===p.main_measured_on);
  need(hash(p.measurement_descriptor_sha256)&&hash(p.origin_receipt_sha256)&&p.measurement_date.origin_receipt_sha256===p.origin_receipt_sha256);cohort(p.row_cohort);need(['n','open','sealed'].every(x=>p.row_cohort[x]<=a.full_cohort[x]));exact(p.cells,['topics','usecases']);
  for(const dim of ['topics','usecases']){need(record(p.cells[dim]));for(const [cat,c]of Object.entries(p.cells[dim])){exact(c,['n','competence']);const d=maps[dim].get(cat);need(d&&count(c.n)&&c.n>0&&c.n<=p.row_cohort.n&&c.n<=d.n&&c.n<=Math.min(d.open,p.row_cohort.open)+Math.min(d.sealed,p.row_cohort.sealed)&&typeof c.competence==='number'&&Number.isFinite(c.competence)&&c.competence<=100);}}
  need(Object.values(p.cells.topics).reduce((s,c)=>s+c.n,0)<=p.row_cohort.n);
 }
 return a;
}
export function datedCarryForBinding(a,b,diagnostic,carryHash,publicHash){
 validateDatedCarryArtifact(a);const p=a.profiles[b.key];need(p&&b.status==='carry'&&a.public_roster_sha256===publicHash);
 exact(diagnostic,['key','model_version','model_pin','main_measured_on','carry_sha256','source_artifact_sha256','source_results_sha256','taxonomy_sha256','cohort_sha256','measurement_descriptor_sha256','origin_receipt_sha256']);
 need(diagnostic.key===b.key&&diagnostic.carry_sha256===carryHash&&hash(carryHash));
 for(const k of ['model_version','model_pin','main_measured_on'])need(diagnostic[k]===p[k]&&p[k]===(k==='main_measured_on'?b.measured_on:b[k]));
 for(const k of ['measurement_revision','measurement_method_version'])need(p[k]===(k==='measurement_method_version'?b.method_version:b[k]));
 for(const k of ['source_artifact_sha256','source_results_sha256','taxonomy_sha256','cohort_sha256'])need(diagnostic[k]===a[k]);
 for(const k of ['measurement_descriptor_sha256','origin_receipt_sha256'])need(diagnostic[k]===p[k]);
 need(b.cohort_sha256===a.cohort_sha256);
 return structuredClone({kind:'dated-old',...p,artifact_revision:a.artifact_revision,category_method_version:a.method_version,metric:a.metric,labelling:a.labelling,rules:a.rules,min_n:a.min_n,taxonomy:a.taxonomy,full_cohort:a.full_cohort,comparison_basis:'OLD_UNEQUATED_NOT_CURRENT',usecase_membership:'multiple',category_split_basis:'Unavailable: original row totals only; full taxonomy splits are not row splits.',source_artifact_sha256:a.source_artifact_sha256,source_results_sha256:a.source_results_sha256,taxonomy_sha256:a.taxonomy_sha256,cohort_sha256:a.cohort_sha256,projection_source_sha256:a.projection_source_sha256,carry_sha256:carryHash});
}
export function datedCarryPageProfile(p,row){need(p?.kind==='dated-old'&&row.status==='carry'&&row.measurement&&same(p,row.carry_categories));return structuredClone(p);}
