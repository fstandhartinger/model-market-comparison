const pins={'phillylabs_philly_decider_v2':'PhillyLabs/philly-decider-v2@36e5ddde2c59021d37ed5974aa7c9f16062050e0','iota-decide-4b-v0.3':'macrocosm-os/iota-decide-4b-v0.3@1da87f01c949e2f8a65e5958ef7cc43ec18da999','decisio-qwen3.6-35b-a3b-v090':'aminry/decisio@333a0a849de7658969a8f8933b34a8097a8c3489'};
export function checkNewRowText(s){
 if(!pins[s.key]||!s.model_pin?.startsWith(pins[s.key]))throw Error('model pin');
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}|PLACEHOLDER/.test(JSON.stringify(s)))throw Error('public template');
 const prose=['display','author','licence','disclosure','code_revision','endpoint_condition','cost_basis'].map(f=>s[f]??'').join(' ')+' '+(s.cost?.basis??'');
 if(/\/home\/|workers\/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|\brank(?:ed|ing)?\b(?! 256)|top[- ](?:five|5)/i.test(prose))throw Error('internal public text');
 if(s.cost?.kind!=='estimate'||!/ESTIMATE/i.test(s.cost?.basis??''))throw Error('cost kind: no measured without bill');
}
