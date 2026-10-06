import metadata from '../data/jevbench-architecture.json' with { type: 'json' };

// CR-292 (Florian 5 Oct 2026, architecture axis): presentation overlay; artifacts retain their legacy class.
export const JEV_ARCH_CLASSES = Object.freeze([
  ['jev-reference', 'Jev — reference (TypeSafe, closed)', 'Jev reference', 'The closed system JevBench is named after, shown as the reference.'],
  ['closed-api', 'Closed API (weights not public)', 'Closed API', 'Available through a hosted API; the weights cannot be downloaded.'],
  ['open-llm-decoder', 'Open weights · LLM decoder', 'LLM decoder', 'An autoregressive language model with public weights, including fine-tunes, merges and Jev rebuilds.'],
  ['open-diffusion-lm', 'Open weights · diffusion LM', 'Diffusion LM', 'A language model that generates by iterative denoising instead of token by token.'],
  ['open-encoder', 'Open weights · encoder / classifier', 'Encoder / classifier', 'BERT-style encoders, NLI zero-shot classifiers and GLiNER-type models.'],
  ['open-reranker', 'Open weights · reranker', 'Reranker', 'A cross-encoder or LLM reranker that scores options against the input.'],
  ['base-control', 'Base model control (no decision fine-tune, raw logits)', 'Base control', 'An official open checkpoint without any decision fine-tune, read out from raw logits, used as a floor.'],
  ['system', 'System (router / cascade / ensemble)', 'System', 'Several models combined at inference time.'],
].map(([id, label, short, oneLine]) => Object.freeze({ id, label, short, oneLine, cssVar: `--jev-a-${id}` })));
const ids = new Set(JEV_ARCH_CLASSES.map((c) => c.id));
const emptyBadges = Object.freeze({ derivation: null, params: null, quant: null });

export function jevArchFor(benchmark, row) {
  const entries = metadata.benchmarks?.[benchmark];
  const entry = entries && Object.hasOwn(entries, row.key) ? entries[row.key] : null;
  if (entry) {
    if (!ids.has(entry.arch)) throw new TypeError(`Invalid architecture for ${benchmark}/${row.key}: ${entry.arch}`);
    return { arch: entry.arch, badges: { ...emptyBadges, ...entry.badges }, evidence: entry.evidence ?? [] };
  }
  const cls = row.class ?? row.cls;
  const isApi = row.api_flag === true || row.apiFlag === true || row.kind === 'api' || row.endpoint_kind === 'api'
    || cls === 'decision-api' || cls === 'jev-service' || cls === 'llm-baseline';
  const arch = (row.key ? /^jev-\d/.test(row.key) : cls === 'jev' && !isApi) ? 'jev-reference'
    : isApi ? 'closed-api'
    : cls === 'reranker' ? 'open-reranker'
    : cls === 'raw-logit-control' ? 'base-control'
    : cls === 'classifier' ? 'open-encoder'
    : 'open-llm-decoder';
  return { arch, badges: { ...emptyBadges, derivation: cls === 'jev-rebuild' ? 'jev-rebuild' : cls === 'raw-logit-control' ? 'original' : null }, evidence: [] };
}

export function jevArchBadgeText(badges) {
  return ['derivation', 'params', 'quant'].map((k) => badges?.[k]).filter((v) => typeof v === 'string' && v.trim()).join(' · ');
}

export function jevArchFields(benchmark, row) {
  const { arch, badges, evidence } = jevArchFor(benchmark, row);
  return { arch, archBadges: badges, archEvidence: evidence };
}
