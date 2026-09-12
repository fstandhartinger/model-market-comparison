import { SCORE_LABELS, type ScoreKey } from './types';
export function scoreVersion(key: ScoreKey, dates?: Record<string, string>) {
  if (key === 'composite') return `7 fixed inputs; Epoch ECI ${dates?.epoch_eci?.slice(0, 10) || 'date unavailable'}; Coding Agent v1.4`;
  if (key === 'epoch_eci' || key === 'epoch_eci_software') return `Epoch source ${dates?.epoch_eci?.slice(0, 10) || 'date unavailable'}`;
  if (key === 'aa_coding_agent') return `v1.4 · ${dates?.aa_coding_agents || 'date unavailable'}`;
  return `unversioned snapshot ${dates?.[key.startsWith('designarena') ? 'designarena' : 'artificialanalysis'] || 'date unavailable'}`;
}
export function scoreLabel(key: ScoreKey, dates?: Record<string, string>) { return `${SCORE_LABELS[key]} · ${scoreVersion(key, dates)}`; }
export function scoreChartLabel(key: ScoreKey, dates?: Record<string, string>) {
  const labels = { composite: 'Composite · 7 fixed inputs, ECI', aa_coding_index: 'AA Coding', aa_coding_agent: 'AA Coding Agent', aa_intelligence_index: 'AA Intelligence', epoch_eci: 'Epoch ECI', epoch_eci_software: 'Epoch Software ECI', designarena_frontend: 'DA Frontend Elo', designarena_fullstack: 'DA Full-Stack Elo' };
  return key === 'composite' ? labels[key] : `${labels[key]} · ${scoreVersion(key, dates).replace('unversioned snapshot', 'snapshot')}`;
}
