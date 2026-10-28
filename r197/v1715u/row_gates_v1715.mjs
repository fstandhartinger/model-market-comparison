// v1.7.15 row gates: the new hosted row's exact identity, n = 1,493 disclosure, tariff cost basis and no internal public text; and the
// unranked mechanism for every row of the 27 Oct draw (never a rank, never in an order list, the exact d1027 note).
export const ROW_KEYS=['microsoft-decision-1-r2'];
export const DRAW_KEYS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think','h2o-lightning-4b-v1.4.1','jeff_1_1_large','jeff_1_1_qwen_4b','microsoft-decision-1-r2','torchcast-decision-31b-v1.0'];
export const NOTE_HEAD="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";
export const NOTE_TAIL="Shown unranked until then.";
export const NOT_RANKED_BECAUSE=NOTE_HEAD+' '+NOTE_TAIL;
export const H2O_EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.';
export const noteFor=k=>NOTE_HEAD+(k==='h2o-lightning-4b-v1.4.1'?' '+H2O_EXTRA:'')+' '+NOTE_TAIL;
const INTERNAL=/\/home\/|workers\/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|d2b677de|9cde338c|Anna|Roth|Gmail|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\brank(?:ed|ing)?\b|top[- ](?:five|5)/i;
export function checkNewRowText(s){
 if(s.key!=='microsoft-decision-1-r2')throw Error('model pin');
 const pin=s.model_pin;
 if(pin&&(pin.response_model!=='microsoft-decision-1'||pin.deployment!=='Decision-1'||pin.provider!=='Microsoft/Azure Foundry'))throw Error('model pin');
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}|PLACEHOLDER/.test(JSON.stringify({...s,v16:undefined})))throw Error('public template');
 const prose=['display','author','licence','disclosure','code_revision','endpoint_condition','cost_basis'].map(f=>s[f]??'').join(' ')+' '+(s.cost?.basis??'');
 if(INTERNAL.test(prose)||/DECISIONS|PREREG\b/.test(prose))throw Error('internal public text');
 if(s.cost?.kind!=='tariff'||!/Advertised Azure Foundry tariff USD 0\.042 per million input tokens, output free/.test(s.cost?.basis??''))throw Error('cost kind or tariff');
 if(!/n = 1,493/.test(s.cost.basis)||!/467,021 input and 1,489 output tokens/.test(s.cost.basis))throw Error('cost token disclosure');
 if(s.display!==undefined&&(s.display!=='Microsoft-Decision-1 (updated weights, Oct 2026)'||s.author!=='Microsoft'))throw Error('display or author');
 if(s.disclosure!==undefined){
  if(!/n = 1,493 of the draw's 1,500 items/.test(s.disclosure)||!/7 sealed items are excluded because this provider had seen them in an earlier evaluation/.test(s.disclosure))throw Error('item count disclosure');
  if(!/served model id \(microsoft-decision-1\) is identical to the first measurement/.test(s.disclosure)||!/27 Oct 2026 regular draw/.test(s.disclosure))throw Error('identity or draw disclosure');
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
