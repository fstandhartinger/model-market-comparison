const SITE = 'https://benchmarkheaven.com';
export const escapeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
export function jevbenchFaq(data) {
  const first = data.ranked[0];
  const open = data.openWeightAlternatives.find((r) => r.capability_eligible);
  const score = (n) => Number.isFinite(n) ? n.toFixed(1) : 'not published';
  return [
    { question: 'What is JevBench?', answer: 'JevBench is Benchmark Heaven’s benchmark for Jev-class decision models: state and a bounded rubric in, a typed answer out. It measures Intelligence, Calibration, Speed and Cost.' },
    { question: 'Which model ranks #1 on JevBench?', answer: `${first.display} ranks #1 by Capability Score (${score(first.capability)}) among ${data.ranked.length} eligible models in ${data.artifact.revision}. Composite is secondary.` },
    { question: 'What is the best open-weight Jev alternative?', answer: open ? `${open.display} is the highest eligible open-weight Jev-class alternative in ${data.artifact.revision}, with Capability ${score(open.capability)} and rank #${open.rank}. Review its licence and source before deployment.` : `No eligible open-weight Jev-class alternative has published openness evidence in ${data.artifact.revision}.` },
    { question: 'How is the Capability Score computed?', answer: `Capability is the arithmetic mean of Intelligence and Calibration. Official ranks include only ranked models within the cost cap (${data.feed.capability_policy.cost_cap_usd_per_1000} USD per 1,000 decisions) and median-latency cap (${data.feed.capability_policy.median_latency_cap_s} seconds). The reference is Jev 1.13.0. Composite is secondary.` },
  ];
}
export function jevbenchMainJsonLd(data) {
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Dataset', name: 'JevBench', description: jevbenchFaq(data)[0].answer, url: `${SITE}/jev-models`,
      dateModified: data.date, version: data.artifact.revision,
      creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: SITE },
      license: 'https://github.com/fstandhartinger/jevbench/blob/main/LICENSE',
      distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE}/api/jevbench/latest` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Benchmark Heaven', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'JevBench', item: `${SITE}/jev-models` },
    ] },
    { '@type': 'FAQPage', mainEntity: jevbenchFaq(data).map(({question,answer}) => ({ '@type': 'Question', name: question, acceptedAnswer: {'@type': 'Answer', text: answer} })) },
  ] };
}
