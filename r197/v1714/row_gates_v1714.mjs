// v1.7.14 new-row gates: exact model pins, display/author, no internal public text, estimate cost with the frozen reference and the
// priced token counts disclosed, device disclosure; and the unranked mechanism (never a rank, never in an order list).
const ROWS={
 'torchcast-decision-31b-v1.0':{pin:'torchcast-ai/torchcast-decision-31b@1e267fc9409654a3ac91c123265c21cddce73a3b',display:'Torchcast Decision 31B v1.0',author:'Torchcast AI',ref:/google\/gemma-4-31b-it at USD 0\.09\/0\.34 per million/,tokens:['645,268'],paid:true},
 'arcbright-elf-1-12b-r2':{pin:'arcbright/elf-1-12b@1018696022ae3fdd9cb8a93e3e972f69c11184c1',display:'Arcbright Elf 1 12B (r2)',author:'Arcbright (arcbright on Hugging Face)',ref:/google\/gemma-3-12b-it at USD 0\.05\/0\.15 per million/,tokens:['610,840','1,500 output']},
 'jeff_1_1_qwen_4b':{pin:'jgeuter/Jeff-1.1-Qwen-4B@5401940b5a8c959cba82187ebfa2dce5a21abc0a',display:'Jeff-1.1-Qwen-4B (jgeuter)',author:'jgeuter (Hugging Face)',ref:/deepinfra:Qwen\/Qwen3\.5-4B at USD 0\.03\/0\.15 per million/,tokens:['629,951','69,580','348,654']},
 'decisio-gemma-4-12b-tuned-commit-think':{pin:'tachara-ai/Decisio-12b-tuned-commit-think@e36aeb243dea3008c593f454112840a1a29e5837',display:'Decisio 12B tuned commit-think (variant of the Decisio family)',author:'tachara-ai (Hugging Face)',ref:/google\/gemma-3-12b-it at USD 0\.05\/0\.15 per million/,tokens:['844,031','727,045','9,121','504,719']},
 'jeff_1_1_large':{pin:'jgeuter/Jeff-1.1-Large@970c21af246a44c5527f7109fca129ab6015c941',display:'Jeff-1.1-Large (jgeuter)',author:'jgeuter (Hugging Face)',ref:/google\/gemma-4-31b-it at USD 0\.09\/0\.34 per million/,tokens:['620,215','21,830','199,718']},
};
export const ROW_KEYS=Object.keys(ROWS).sort();
export function checkNewRowText(s){
 const r=ROWS[s.key];
 if(!r||s.model_pin!==r.pin)throw Error('model pin');
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}|PLACEHOLDER/.test(JSON.stringify(s)))throw Error('public template');
 const prose=['display','author','licence','disclosure','code_revision','endpoint_condition','cost_basis'].map(f=>s[f]??'').join(' ')+' '+(s.cost?.basis??'');
 if(/\/home\/|workers\/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy|custody|auto-intake|\br59\b|69f7a75d|54575fd5|h2o141|tc31b|jevbench-add-requests|\bfusion\b|\bworker\b|fast-lane order|paid order|\brank(?:ed|ing)?\b|top[- ](?:five|5)/i.test(prose)||/DECISIONS|PREREG\b/.test(prose))throw Error('internal public text');
 if(s.cost?.kind!=='estimate'||!/ESTIMATE/.test(s.cost?.basis??''))throw Error('cost kind: no measured without bill');
 if(!r.ref.test(s.cost?.basis??'')||!r.tokens.every(t=>s.cost.basis.includes(t))||!/over all 1,500 items/.test(s.cost.basis))throw Error('cost reference or token disclosure');
 if(s.display!==r.display||s.author!==r.author)throw Error('display or author');
 if(!/RTX PRO 6000/.test(s.endpoint_condition??'')||!/RTX PRO 6000/.test(s.disclosure??''))throw Error('device disclosure');
 if(!/27 Oct 2026 regular draw/.test(s.disclosure??''))throw Error('draw disclosure');
}
// v1.7.14 ships every new row unranked (provisional until its draw is equated): it can never carry a rank or sit in an order list.
export const NOT_RANKED_BECAUSE="Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale. This draw differs strongly from earlier draws (72% multilingual items). Shown unranked until the draw is equated.";
export function checkUnrankedRow(s,board){
 if(s.ranked!==false||s.rank!==null||s.listing!=='unranked')throw Error('unranked row is ranked');
 if(JSON.stringify(s.ranks)!==JSON.stringify({A:null,B:null,C:null,capability:null}))throw Error('unranked row has ranks');
 if(s.not_ranked_because!==NOT_RANKED_BECAUSE)throw Error('unranked reason');
 for(const [m,b] of Object.entries(board??{}))if((b?.order??[]).includes(s.key))throw Error('unranked row in order list '+m);
}
