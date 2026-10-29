// v1.7.22 row gates: the new self-hosted row's exact identity (Umpire), its 1,500-item / 5-refusal disclosure, its estimate cost basis on the
// common set, no internal public text; and the unranked mechanism for every row of the 27 Oct draw (never a rank, never in an order
// list, the exact d1027 note).
export const ROW_KEYS=['umpire-35b-a3b'];
export const DRAW_KEYS=["arcbright-elf-1-12b-r2", "chaoliangunsw-jev-style-2b-decision-v4", "decisio-gemma-4-12b-tuned-commit-think", "decisionnode-flash-0.9.1-rc1", "decisionnode-main-0.9.1-rc1", "h2o-lightning-4b-v1.4.1", "jeff_1_1_large", "jeff_1_1_qwen_4b", "microsoft-decision-1-r2", "strike-1", "torchcast-decision-31b-v1.0", "umpire-35b-a3b", "visionjev-1.0.0-27b"];
export const NOTE_HEAD="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";
export const NOTE_TAIL="Shown unranked until then.";
export const NOT_RANKED_BECAUSE=NOTE_HEAD+' '+NOTE_TAIL;
export const H2O_EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.';
export const STRIKE_NOTE="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.";
export const noteFor=k=>[ROW_KEYS[0],"visionjev-1.0.0-27b"].includes(k)?STRIKE_NOTE:{"arcbright-elf-1-12b-r2": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "chaoliangunsw-jev-style-2b-decision-v4": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "decisio-gemma-4-12b-tuned-commit-think": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "decisionnode-flash-0.9.1-rc1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "decisionnode-main-0.9.1-rc1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "h2o-lightning-4b-v1.4.1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1. Shown unranked until then.", "jeff_1_1_large": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "jeff_1_1_qwen_4b": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "microsoft-decision-1-r2": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "strike-1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "torchcast-decision-31b-v1.0": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then."}[k];
const INTERNAL=/\/home\/|workers\/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|\br65\b|9D88ECFA|d2b677de|9cde338c|\bkit\b|Anna|Roth|Gmail|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\brank(?:ed|ing)?\b|top[- ](?:five|5)/i;
export function checkNewRowText(s){
 if(s.key!==ROW_KEYS[0])throw Error('key');
 const prose=['display','author','licence','disclosure','endpoint_condition'].map(f=>s[f]??'').join(' ')+' '+(s.cost?.basis??'');
 if(INTERNAL.test(prose)||/DECISIONS|PREREG\b|\{[A-Z_]+\}/.test(prose))throw Error('internal public text');
 if(s.cost?.kind!=='estimate'||!s.cost.basis.includes('Qwen/Qwen3.5-35B-A3B at USD 0.3125/M input and 1.25/M output'))throw Error('price reference');
 for(const t of ['SIZE/ARCHITECTURE-CLASS','declares no parent','no lineage is asserted'])if(!s.cost.basis.includes(t))throw Error('class estimate '+t);
 if(!s.cost.basis.includes('0 output tokens on the 1,489 common items')||!s.cost.basis.includes('Cost on the 1,489 items every row on this draw answered (same-items rule)'))throw Error('cost basis');
 if(s.disclosure!==undefined){
  for(const t of ['ornith-ai/Ornith-1.5-35B-A3B',"author's unchanged Transformers server",'16,384-token input limit','scored as misses and kept in the denominator','output tokens reported as 0','49 of 50','training data were not inspected','Apache-2.0','CC BY-NC 4.0','dequantized','KERNEL PATH','disposable rented pod'])if(!s.disclosure.includes(t))throw Error('disclosure '+t);
  if(s.display!=='Umpire 35B-A3B'||s.author!=='ezoushen (Hugging Face)')throw Error('identity');
  if(s.model_pin?.revision!=='c928afd208de9f85d2c194042364b1a62ca4d080')throw Error('revision');
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
