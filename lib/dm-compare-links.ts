export const DM_COMPARE_LINKS: Record<string, {path: string; label: string}> = {
  'openai-decisions': {path: '/openai-decisions-api-alternative', label: 'OpenAI Decisions API alternatives (Decision Models)'},
  'microsoft-decision-1': {path: '/decision-1-vs-decision-models', label: 'Microsoft Decision-1 vs Decision Models'},
  laya: {path: '/laya-model', label: 'Laya model (Decision Models)'},
};

export const DM_COMPARE_FALLBACK = {path: '/jev-compatible-apis-compared', label: 'Jev-compatible APIs compared (Decision Models)'};

export function dmCompareHref(rivalKey: string): string {
  const {path} = DM_COMPARE_LINKS[rivalKey] ?? DM_COMPARE_FALLBACK;
  return `https://decisionmodels.io${path}?utm_source=benchmarkheaven&utm_medium=compare-page&utm_content=${encodeURIComponent(rivalKey)}`;
}

export const DM_COMPARE_DISCLOSURE = 'Decision Models is run by the same company as Benchmark Heaven. This link is the same on every comparison page and never affects scores or ranks.';
