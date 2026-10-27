const pins={'h2o-lightning-4b-v1.4.1':'h2oai/h2o-lightning-4b@cc18ee330e6895c41b9a60f37a0dd122dc4c3461'};
export function checkNewRowText(s){
 if(!pins[s.key]||s.model_pin!==pins[s.key])throw Error('model pin');
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}|PLACEHOLDER/.test(JSON.stringify(s)))throw Error('public template');
 const prose=['display','author','licence','disclosure','code_revision','endpoint_condition','cost_basis'].map(f=>s[f]??'').join(' ')+' '+(s.cost?.basis??'');
 if(/\/home\/|workers\/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|54575fd5|h2o141|\brank(?:ed|ing)?\b(?! 256)|top[- ](?:five|5)/i.test(prose)||/DECISIONS/.test(prose))throw Error('internal public text');
 if(s.cost?.kind!=='estimate'||!/ESTIMATE/.test(s.cost?.basis??''))throw Error('cost kind: no measured without bill');
 if(!/deepinfra:Qwen\/Qwen3\.5-4B at USD 0\.03\/0\.15 per million/.test(s.cost?.basis??'')||!/711,020/.test(s.cost.basis)||!/944,694/.test(s.cost.basis))throw Error('cost reference or token disclosure');
 if(s.display!=='H2O-Lightning-4B v1.4.1'||s.author!=='H2O.ai')throw Error('display or author');
 if(!/RTX PRO 6000/.test(s.endpoint_condition??'')||!/RTX PRO 6000/.test(s.disclosure??''))throw Error('device disclosure');
}
