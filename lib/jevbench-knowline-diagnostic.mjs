export const KNOWLINE_DIAGNOSTIC_KEY='knowline-26b-a4b-gen2.5';
export const KNOWLINE_DIAGNOSTIC_REASON='The Noul decisiveness diagnostic is unavailable because the stored summaries do not record which timed-out answers were decisive.';
export function validateKnowlineDecisiveness(row){
 const d=row.noul_decisive;
 if(row.key===KNOWLINE_DIAGNOSTIC_KEY){
  if(d?.supported!==true||d.n!==375||d.decisive!==null||d.decisive_rate!==null||d.acc_among_decisive!==null||d.unavailable_reason!==KNOWLINE_DIAGNOSTIC_REASON)throw Error('KnowLine diagnostic must be unavailable');
 }else if(d?.unavailable_reason!==undefined)throw Error('KnowLine diagnostic allowance is scoped to one key');
 return true;
}
export function knowlineDiagnosticUnavailable(row){
 return row.key===KNOWLINE_DIAGNOSTIC_KEY&&row.noul_decisive?.unavailable_reason===KNOWLINE_DIAGNOSTIC_REASON;
}
