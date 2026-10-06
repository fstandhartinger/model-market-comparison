export type JevArchId = 'jev-reference' | 'closed-api' | 'open-llm-decoder' | 'open-diffusion-lm' | 'open-encoder' | 'open-reranker' | 'base-control' | 'system';
export type JevArchBadges = { derivation: string | null; params: string | null; quant: string | null };
export type JevArchEvidence = { url: string; kind: string; fact: string };
export type JevArchRow = { key?: string; class?: string | null; cls?: string; api_flag?: boolean; apiFlag?: boolean; kind?: string; endpoint_kind?: string | null; arch?: string; archBadges?: JevArchBadges };
export declare const JEV_ARCH_CLASSES: readonly { id: JevArchId; label: string; short: string; oneLine: string; cssVar: string }[];
export declare function jevArchFor(benchmark: string, row: JevArchRow): { arch: JevArchId; badges: JevArchBadges; evidence: JevArchEvidence[] };
export declare function jevArchBadgeText(badges?: JevArchBadges | null): string;
export declare function jevArchFields(benchmark: string, row: JevArchRow): { arch: JevArchId; archBadges: JevArchBadges; archEvidence: JevArchEvidence[] };
