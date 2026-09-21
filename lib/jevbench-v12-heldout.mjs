// CR-109 (Florian 2026-09-21): hard-tier public/held-out diagnostics.
// Every displayed number is derived from the frozen per-task artifact: public outcomes
// are counted directly; held-out counts are the frozen all-hard totals minus public.

const Z95 = 1.96;
const outcomeCounts = (outcomes, hardIds) => {
  const counts = { c: 0, w: 0, f: 0, n: 0 };
  for (const id of hardIds) counts[outcomes[id][0]] += 1;
  return counts;
};
const attempted = (x) => x.c + x.w + x.f;

export function jevbenchV12HeldoutView(tasksArtifact) {
  const hardIds = tasksArtifact.tasks.filter((t) => t.tier === 'hard').map((t) => t.id);
  const rows = Object.entries(tasksArtifact.systems).map(([key, system]) => {
    const publicCounts = outcomeCounts(system.public_tasks, hardIds);
    const total = system.by_tier.hard;
    const heldoutCounts = Object.fromEntries(['c', 'w', 'f', 'n'].map((k) => [k, (total[k] ?? 0) - publicCounts[k]]));
    if (Object.values(heldoutCounts).some((n) => n < 0)) throw new Error(`JevBench held-out: ${key} has inconsistent hard counts`);
    const publicN = attempted(publicCounts);
    const heldoutN = attempted(heldoutCounts);
    const publicAccuracy = publicN ? publicCounts.c / publicN : null;
    const heldoutAccuracy = heldoutN ? heldoutCounts.c / heldoutN : null;
    const gap = publicAccuracy === null || heldoutAccuracy === null ? null : publicAccuracy - heldoutAccuracy;
    const se = gap === null ? null : Math.sqrt(publicAccuracy * (1 - publicAccuracy) / publicN + heldoutAccuracy * (1 - heldoutAccuracy) / heldoutN);
    return { key, display: system.display, partial: system.partial, publicCorrect: publicCounts.c, publicN, publicAccuracy, heldoutCorrect: heldoutCounts.c, heldoutN, heldoutAccuracy, gap, ciLow: gap === null ? null : gap - Z95 * se, ciHigh: gap === null ? null : gap + Z95 * se };
  });
  const baseline = rows.filter((r) => !r.partial && r.publicN === tasksArtifact.task_counts.hard.public && r.heldoutN === tasksArtifact.task_counts.hard.heldout_or_imported && r.gap !== null);
  if (!baseline.length) throw new Error('JevBench held-out: no complete hard-tier systems');
  const fieldMeanGap = baseline.reduce((sum, r) => sum + r.gap, 0) / baseline.length;
  return { rows, fieldMeanGap, fieldN: baseline.length, publicItems: tasksArtifact.task_counts.hard.public, heldoutItems: tasksArtifact.task_counts.hard.heldout_or_imported };
}
