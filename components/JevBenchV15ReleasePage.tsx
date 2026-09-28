import { JevBenchV15 } from './JevBenchV15Preview';
import type { JevV15Artifact } from '../lib/jevbench-v15-preview.mjs';

export function JevBenchV15ReleasePage({ artifact, sha256, versionPath = '/jev-models/v1.5.0' }: {
  artifact: JevV15Artifact;
  sha256: string;
  versionPath?: string;
}) {
  return <>
    <header className="bh-page-head" data-bh-jev15-release-header>
      <p className="bh-eyebrow" data-bh-jev-frozen-version>Official JevBench release {artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench {artifact.revision} — Jev alternatives ranking</h1>
      <p className="bh-muted mt-3 max-w-3xl">JevBench measures Jev-class decision models on intelligence, calibration, speed and cost. v1.5 doubles the sample to {artifact.sample.total.toLocaleString('en-US')} decisions per system, scores Choice, Noul and Score requests natively and gives the fresh sealed set half of Intelligence. The official headline uses equal axis weights and gives the three request types equal weight; option B remains a secondary view.</p>
      <p className="bh-muted mt-2 max-w-3xl text-xs" data-bh-jev-meta>{artifact.sample.open} open + {artifact.sample.sealed} sealed decisions · {artifact.n_ranked} ranked of {artifact.roster_count} roster systems · only system-level sealed aggregates are published.</p>
      <p className="bh-muted mt-2 max-w-3xl text-xs">Published data: <a className="text-accent underline" href="/api/jevbench/v1.5.0">aggregate results JSON</a> · SHA-256 <code className="break-all" title={sha256}>{sha256}</code>.</p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-jev-version-share-row>
        <a className="text-accent underline" href={versionPath} data-bh-jev-version-share>Share this version</a>
        {versionPath !== '/jev-models' && <> · <a className="text-accent underline" href="/jev-models" data-bh-jev-live-link>View live board</a></>}
        {' · '}
        <a className="text-accent underline" href="/jev-models/v1.4.2.2">Previous release: v1.4.2.2</a>
      </p>
    </header>
    <JevBenchV15 artifact={artifact} sha256={sha256} />
  </>;
}
