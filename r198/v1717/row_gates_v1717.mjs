// v1.7.17 row gates: the new hosted row's exact identity (Strike-1), its 1,500-item / 5-refusal disclosure, its estimate cost basis on the
// common set, no internal public text; and the unranked mechanism for every row of the 27 Oct draw (never a rank, never in an order
// list, the exact d1027 note).
export const ROW_KEYS=['chaoliangunsw-jev-style-2b-decision-v4'];
export const DRAW_KEYS=['chaoliangunsw-jev-style-2b-decision-v4','arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think','h2o-lightning-4b-v1.4.1','jeff_1_1_large','jeff_1_1_qwen_4b','microsoft-decision-1-r2','strike-1','torchcast-decision-31b-v1.0'].sort();
export const NOTE_HEAD="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";
export const NOTE_TAIL="Shown unranked until then.";
export const NOT_RANKED_BECAUSE=NOTE_HEAD+' '+NOTE_TAIL;
export const H2O_EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.';
export const STRIKE_NOTE="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.";
export const noteFor=k=>[ROW_KEYS[0],'strike-1'].includes(k)?STRIKE_NOTE:NOTE_HEAD+(k==='h2o-lightning-4b-v1.4.1'?' '+H2O_EXTRA:'')+' '+NOTE_TAIL;
const INTERNAL=/\/home\/|workers\/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|\br65\b|9D88ECFA|d2b677de|9cde338c|\bkit\b|Anna|Roth|Gmail|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\brank(?:ed|ing)?\b|top[- ](?:five|5)/i;
export function checkNewRowText(s){
 if(s.key!==ROW_KEYS[0])throw Error('key');
 const prose=['display','author','licence','disclosure','endpoint_condition'].map(f=>s[f]??'').join(' ')+' '+(s.cost?.basis??'');
 if(INTERNAL.test(prose)||/DECISIONS|PREREG\b|\{[A-Z_]+\}/.test(prose))throw Error('internal public text');
 if(s.cost?.kind!=='estimate'||!s.cost.basis.includes('deepinfra:Qwen/Qwen3.5-2B, USD 0.02 per million input tokens and USD 0.10 per million output tokens'))throw Error('price reference');
 if(!s.cost.basis.includes('0 output tokens on the 1,489 common items')||!s.cost.basis.includes('Cost on the 1,489 items every row on this draw answered (same-items rule)'))throw Error('cost basis');
 if(s.disclosure!==undefined){
  for(const t of ["full fine-tune of Qwen/Qwen3.5-2B",'soft labels distilled from TypeSafe Jev 1.14 via its public API','official train splits of several public benchmarks',"author's own documented HTTP server",'32,768-token input limit','scored as misses and kept in the denominator','output tokens reported as 0','multimodal tower','disposable rented pod'])if(!s.disclosure.includes(t))throw Error('disclosure '+t);
  if(s.display!=='Jev-Style-2B'||s.author!=='chaoliangUNSW')throw Error('identity');
  if(s.model_pin?.revision!=='c9504148dae7f7a43d67a5782f12a015a4b4022c')throw Error('revision');
 }
}
export function checkUnrankedRow(s,board){
 if(s.ranked!==false||s.rank!==null||s.listing!=='unranked')throw Error('unranked row is ranked');
 if(JSON.stringify(s.ranks)!==JSON.stringify({A:null,B:null,C:null,capability:null}))throw Error('unranked row has ranks');
 if(s.not_ranked_because!==noteFor(s.key))throw Error('unranked reason');
 if('listing_note' in s||'published_scores' in s)throw Error('equated-row fields on an unranked row');
 if(s.draw?.status!=='anchor-runs-pending'||s.draw.offset?.I!==0||s.draw.offset?.C!==0)throw Error('draw equated');
 for(const [m,b] of Object.entries(board??{}))if((b?.order??[]).includes(s.key))throw Error('unranked row in order list '+m);
}
