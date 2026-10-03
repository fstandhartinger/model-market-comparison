// Public synthetic aggregate only. No real model, labels, score, provenance or admission.
export function categoryFixture({ apiFirst = 100, firstN = 250 } = {}) {
  const categories = Array.from({ length: 6 }, (_, i) => {
    const n = i ? (1500 - firstN) / 5 : firstN;
    const publicN = apiFirst < 30 || firstN < 30 ? (i ? 60 : 0) : 50;
    return { key: `synthetic-${i}`, label: `Synthetic category ${i}`, covers: 'Public synthetic fixture only.',
      n, public: publicN, sealed: n - publicN, low_n: n < 30 };
  });
  const cell = (n, publicN) => n ? { n, public: publicN, sealed: n - publicN, n_by_type: { choice: n },
    failed: 1, accuracy: 0.25, competence: -12.5, score: 0, low_n: n < 30 } :
    { n: 0, public: 0, sealed: 0, low_n: true, competence: null, score: null, unavailable: 'No items in this lane category.' };
  const local = Object.fromEntries(categories.map(d => [d.key, cell(d.n, d.public)]));
  const api = Object.fromEntries(categories.map((d, i) => [d.key, cell(i ? (600 - apiFirst) / 5 : apiFirst, d.public)]));
  const measurement = (lane, cells) => ({ lane, cohort: lane === 'api' ? 'A300+P300' : 'S1200+P300',
    measured_on: lane === 'api' ? '2000-01-02' : '2000-01-01', equated: false,
    ...Object.fromEntries(['topics', 'usecases', 'languages'].map(dim => [dim, structuredClone(cells)])) });
  return { kind: 'category-aggregates', benchmark: 'jevbench', revision: 'v1.6.0', min_n: 30,
    metric: 'Raw chance-corrected competence; equal weights across present request types.',
    rules: ['API categories use A300+P300 and are unequated.', 'Self-hosted categories use S1200+P300.',
      'Failures stay in the original denominator.', 'Competence is unclipped; score clips to 0–100.',
      'Usecase and language are the original frozen metadata.', 'Empty cells are unavailable; counts below min_n are marked.'],
    provenance: Object.fromEntries(['scorer_sha256', 'cohort_sha256', 'labels_sha256', 'label_runtime_sha256'].map(k => [k, 'a'.repeat(64)])),
    ...Object.fromEntries(['topics', 'usecases', 'languages'].map(dim => [dim, structuredClone(categories)])),
    systems: { 'synthetic-a': measurement('selfhosted', local), 'synthetic-b': measurement('api', api) },
    plotted_coverage_complete: apiFirst !== 0 || firstN < 30 };
}
