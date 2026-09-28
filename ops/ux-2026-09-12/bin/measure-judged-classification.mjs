// D250 (2026-09-28). `data/benchmark-caveats.json` decides which boards carry the `Judged` tag and
// which rows a category composite may average (lib/benchmark-matrix.mjs: `objective` excludes
// `row.judged`; lib/category-scores.mjs refuses a judged anchor). It was written in iteration 77
// against 32 boards and has never had a coverage gate, so every board added since could only be
// classified by someone remembering to. This screen reads each family's own registry text and
// reports the families that say a judge, a panel, a rubric or an Elo decides the number while the
// caveats file classifies them neither way.
//
// The screen is deliberately crude and over-reports; the inventory it feeds
// (test/d250-judged-coverage.test.mjs) is what makes a miss visible, not this file's verdict.
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const registry = read('../../../data/raw/benchmarks/registry.json');
const caveats = read('../../../data/benchmark-caveats.json');

// Every registry entry carries this retention sentence; its "judge revisions" is about keeping
// identities apart, never about how the board is scored. Left in, it screens in 40 boards that say
// nothing about judging at all.
const BOILERPLATE = /different harnesses, subsets, judge revisions and versions must remain separate\.?/gi;
export const JUDGE_SCREEN = /judge|jury|vote|preference|rubric|\belo\b|pairwise|win rate|graded by|human rater/i;

export function screenedText(entry) {
  const scoring = entry.scoring ?? {};
  return [entry.one_sentence_description, scoring.metric, scoring.notes]
    .filter(Boolean).join(' ').replace(BOILERPLATE, ' ');
}

export function unclassifiedJudgeCandidates(reg = registry, cav = caveats) {
  const known = new Set([...Object.keys(cav.judged ?? {}), ...Object.keys(cav.considered_not_judged ?? {})]);
  const out = new Map();
  for (const entry of reg.entries) {
    if (known.has(entry.family) || out.has(entry.family)) continue;
    const text = screenedText(entry);
    if (JUDGE_SCREEN.test(text)) out.set(entry.family, { id: entry.id, category: entry.category, text });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const families = new Set(registry.entries.map((e) => e.family));
  const candidates = unclassifiedJudgeCandidates();
  const report = {
    generated_at: new Date().toISOString(),
    families: families.size,
    judged: Object.keys(caveats.judged).length,
    considered_not_judged: Object.keys(caveats.considered_not_judged).length,
    unclassified_families: families.size - Object.keys(caveats.judged).length - Object.keys(caveats.considered_not_judged).length,
    screened_unclassified: [...candidates.keys()].sort(),
    detail: Object.fromEntries([...candidates].map(([k, v]) => [k, {
      id: v.id, category: v.category,
      matched: v.text.match(new RegExp(JUDGE_SCREEN, 'gi')) ?? [],
      sentences: v.text.split(/(?<=[.;])\s+/).filter((s) => JUDGE_SCREEN.test(s)).slice(0, 3),
    }])),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
