import { JevBenchV15, Sha } from './JevBenchV15Preview';
import { CustomEvaluationOffer } from './CustomEvaluationOffer';
import { readJevbenchV1422 } from '../lib/jevbench-v1422.mjs';
import { readJevbenchV150Release, readJevbenchV151Release, readJevbenchV152Release } from '../lib/jevbench-v15-release.mjs';
import type { JevV15Artifact } from '../lib/jevbench-v15-preview.mjs';

export async function JevBenchV15ReleasePage({ artifact, sha256, versionPath = '/jev-models/v1.5.0', live = false }: {
  artifact: JevV15Artifact;
  sha256: string;
  versionPath?: string;
  /** True on the live board (`/jev-models`): the hero names the benchmark, not the release (Fable pass 42, F-222). */
  live?: boolean;
}) {
  // CR-205: a release compares against the immediately prior official ranking; v1.5.0 began at v1.4.2.2.
  const previousKeys = artifact.revision === 'v1.5.3'
    ? (await readJevbenchV152Release()).artifact.systems.map((row: { key: string }) => row.key)
    : artifact.revision === 'v1.5.2'
    ? (await readJevbenchV151Release()).artifact.systems.map((row: { key: string }) => row.key)
    : artifact.revision === 'v1.5.1'
      ? (await readJevbenchV150Release()).artifact.systems.map((row: { key: string }) => row.key)
      : (await readJevbenchV1422()).artifact.systems.map((row: { key: string }) => row.key);
  const canonical = `https://benchmarkheaven.com${versionPath}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${canonical}#page`,
        url: canonical, name: `JevBench ${artifact.revision} — official Jev alternatives ranking`,
        description: `Independent comparison of ${artifact.systems.length} Jev-class systems across ${artifact.sample.total.toLocaleString('en-US')} open and sealed decisions each.`,
        isPartOf: { '@id': 'https://benchmarkheaven.com/#website' },
        mainEntity: { '@id': `${canonical}#dataset` },
      },
      {
        '@type': 'Dataset', '@id': `${canonical}#dataset`,
        name: `JevBench ${artifact.revision} results`,
        description: `Measured JevBench results for ${artifact.systems.length} Jev-class systems on ${artifact.sample.total.toLocaleString('en-US')} typed decisions each.`,
        url: canonical,
        creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: 'https://benchmarkheaven.com' },
        license: 'https://github.com/fstandhartinger/jevbench/blob/main/LICENSE',
        isAccessibleForFree: true,
        variableMeasured: ['JevBench Score', 'Intelligence', 'Calibration', 'Speed', 'Cost'],
        distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `https://benchmarkheaven.com/api/jevbench/${artifact.revision}` }],
      },
      {
        '@type': 'FAQPage', '@id': `${canonical}#faq`,
        mainEntity: [
          {
            '@type': 'Question', name: 'What are open-source alternatives to Jev?',
            acceptedAnswer: { '@type': 'Answer', text: `JevBench ${artifact.revision} ranks open implementations with published code or weights alongside hosted systems; the board links each tested project and records its code and model licences.` },
          },
          {
            '@type': 'Question', name: 'Which Jev-class models can I self-host in the EU or use for a GDPR-sensitive workload?',
            acceptedAnswer: { '@type': 'Answer', text: 'Open entrants with released code or weights can be deployed on infrastructure you choose, including EU infrastructure. That can support a data-residency plan, but a model licence or EU server location does not by itself make a deployment GDPR-compliant; the controller must assess the complete processing setup.' },
          },
          {
            '@type': 'Question', name: 'How is JevBench scored?',
            acceptedAnswer: { '@type': 'Answer', text: `JevBench ${artifact.revision} combines Intelligence, Calibration, Speed and Cost in an equal-weight harmonic mean with low-axis gates. Half of Intelligence comes from sealed decisions, an open-minus-sealed gap beyond the field median costs Intelligence, and the three request types — Choice, Noul and Score — carry equal weight.` },
          },
          {
            '@type': 'Question', name: 'How do I submit my model?',
            acceptedAnswer: { '@type': 'Answer', text: 'Open an issue in the JevBench repository with a reproducible endpoint or runnable code, the exact model and licence, and any public-task training disclosure. New entrants are measured with the same harness and published in a new version or a disclosed roster addendum.' },
          },
        ],
      },
    ],
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <header className="bh-page-head" data-bh-jev15-release-header data-bh-jev15-hero={live ? 'live' : 'pinned'}>
      {/* F-222 (Fable pass 42): the hero says what JevBench is, then the release facts on one small line; the release notes live in "Method notes". */}
      <div className="bh-eyebrow flex flex-nowrap items-center" data-bh-jev-frozen-version>
        {live
          ? <span><span className="sm:hidden">JevBench {artifact.revision}</span><span className="hidden sm:inline">JevBench {artifact.revision} · our own benchmark</span></span>
          : <span>Official JevBench release {artifact.revision}</span>}
        <CustomEvaluationOffer />
      </div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{live ? 'JevBench by Benchmark Heaven' : `JevBench ${artifact.revision} — Jev alternatives ranking`}</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark</b> for Jev-class decision models: state and a bounded rubric in, a typed answer out.</p>
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        {live ? `Release ${artifact.revision}` : 'Frozen release'} · {artifact.sample.total.toLocaleString('en-US')} decisions per system ({artifact.sample.open} open + {artifact.sample.sealed} sealed; sealed decisions are half of Intelligence) · {artifact.n_ranked} ranked of {artifact.roster_count} roster systems · only system-level sealed aggregates are published ·{' '}
        <a className="text-accent underline" href={`/api/jevbench/${artifact.revision}`}>aggregate results JSON</a> sha256 <Sha v={sha256} />
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-image-jev-link-row>
        Making decisions from images? <a className="text-accent font-semibold underline" href="/image-jev-bench" data-bh-image-jev-link>Explore Image JevBench v0.1.4 and compare its systems</a>.
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-jev-version-share-row>
        <a className="text-accent underline" href={versionPath} data-bh-jev-version-share>Share this version</a>
        {!live && <span className="bh-muted"> · <a className="text-accent underline" href="/jev-models" data-bh-jev-live-link>View live board</a></span>}
        <span className="bh-muted"> · Previous release: <a className="text-accent underline" href={artifact.revision === 'v1.5.3' ? '/jev-models/v1.5.2' : artifact.revision === 'v1.5.2' ? '/jev-models/v1.5.1' : artifact.revision === 'v1.5.1' ? '/jev-models/v1.5.0' : '/jev-models/v1.4.2.2'}>{artifact.revision === 'v1.5.3' ? 'JevBench v1.5.2' : artifact.revision === 'v1.5.2' ? 'JevBench v1.5.1' : artifact.revision === 'v1.5.1' ? 'JevBench v1.5.0' : 'JevBench v1.4.2.2'}</a></span>
      </p>
    </header>
    <JevBenchV15 artifact={artifact} sha256={sha256} previousKeys={previousKeys} />
  </>;
}
