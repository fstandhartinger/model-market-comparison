import { SCORE_LABELS, type ScoreKey } from './types';
export function scoreVersion(key: ScoreKey, dates?: Record<string, string>) {
  if (key === 'composite') return `7 fixed inputs; Epoch ECI ${dates?.epoch_eci?.slice(0, 10) || 'date unavailable'}; Coding Agent v1.4`;
  if (key === 'epoch_eci' || key === 'epoch_eci_software') return `Epoch source ${dates?.epoch_eci?.slice(0, 10) || 'date unavailable'}`;
  // CR-65.11: the pinned value is the retained v1.4 snapshot; AA itself now publishes v1.5.
  if (key === 'aa_coding_agent') return `v1.4 snapshot ${dates?.aa_coding_agents || 'date unavailable'} (AA now publishes v1.5)`;
  // CR-34.4: the Agentic Index is relayed from Artificial Analysis by OpenRouter's
  // Benchmarks API (AA's own free API has no agentic field); its date is the relay capture.
  if (key === 'aa_agentic_index') return `snapshot ${dates?.openrouter_aa_relay || 'date unavailable'} · Artificial Analysis via OpenRouter`;
  // CR-25.6: a category composite is versioned by its anchor set, recorded in data/category-score-anchors.json.
  if (key.startsWith('cat_')) return 'category composite · fixed anchor benchmarks';
  return `unversioned snapshot ${dates?.[key.startsWith('designarena') ? 'designarena' : 'artificialanalysis'] || 'date unavailable'}`;
}
export function scoreLabel(key: ScoreKey, dates?: Record<string, string>) { return `${SCORE_LABELS[key]} · ${scoreVersion(key, dates)}`; }
export function scoreChartLabel(key: ScoreKey, dates?: Record<string, string>) {
  const labels = { composite: 'Composite · 7 fixed inputs, ECI', aa_coding_index: 'AA Coding', aa_coding_agent: 'AA Coding Agent', aa_intelligence_index: 'AA Intelligence', aa_agentic_index: 'AA Agentic', epoch_eci: 'Epoch ECI', epoch_eci_software: 'Epoch Software ECI', designarena_frontend: 'DA Web Apps Elo', designarena_fullstack: 'DA Full-Stack Elo', cat_coding: 'Coding composite', cat_agentic: 'Agentic composite', cat_science: 'Science composite', cat_long_context: 'Long-context composite' };
  return key === 'composite' ? labels[key] : `${labels[key]} · ${scoreVersion(key, dates).replace('unversioned snapshot', 'snapshot')}`;
}
