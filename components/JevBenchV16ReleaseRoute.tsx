import { readJevbenchV16Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV156Release } from '../lib/jevbench-v15-release.mjs';
import { JevBenchV16Board } from './JevBenchV16Board';
import { JevBenchReleaseVersionNav } from './JevBenchReleaseVersionNav';

type ReleaseData = Awaited<ReturnType<typeof readJevbenchV16Release>>;

export async function JevBenchV16ReleaseRoute({ live = false, release, versionPath }: {
  live?: boolean; release?: ReleaseData; versionPath?: string;
}) {
  const [{ artifact, sha256, categories, categoriesSha256, carry, carrySha256 }, previous] = await Promise.all([
    release ? Promise.resolve(release) : readJevbenchV16Release(), readJevbenchV156Release(),
  ]);
  const ranked = artifact.systems.filter((system) => system.ranked);
  const carryCount = carry.rows.length;
  const publishedKeys = new Set([...artifact.systems, ...artifact.not_measured, ...carry.rows].map((row) => row.key));
  const missingPrevious = [...previous.artifact.systems, ...previous.artifact.not_measured]
    .filter((row) => !['djev', 'djev-thinking'].includes(row.key) && !publishedKeys.has(row.key));
  if (missingPrevious.length) throw new Error(`JevBench v1.6.0 catalogue omits public prior rows: ${missingPrevious.map((row) => row.key).join(', ')}`);
  const sharePath = versionPath ?? (live ? '/jev-models' : '/jev-models/v1.6.0');

  return <>
    <JevBenchReleaseVersionNav active="v1.6.0" />
    <header className="bh-page-head" data-bh-jev16-release-header data-bh-jev16-live={live ? 'true' : undefined}>
      <div className="bh-eyebrow flex flex-nowrap items-center" data-bh-jev-frozen-version>
        {(artifact as { status?: string }).status === 'overnight-preview' ? 'JevBench v1.6.0 · private overnight preview' : 'Official JevBench v1.6.0'}
      </div>
      {(artifact as { status?: string }).status === 'overnight-preview' && <p className="mt-2 max-w-3xl rounded border border-amber-500 bg-amber-500/10 p-3 text-sm" data-bh-jev16-overnight-banner>
        <b>Private preview, not published.</b> {(artifact as { label?: string }).label}. {(artifact as { source_note?: string }).source_note} Numbers can still change before a release decision.
      </p>}
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{live ? 'JevBench by Benchmark Heaven' : 'JevBench v1.6.0 — Jev alternatives ranking'}</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark</b> for Jev-class decision models: state and a bounded rubric in, a typed answer out.</p>
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        Release v1.6.0 · {artifact.v16.counts.selfhosted_input.toLocaleString('en-US')} decisions per self-hosted system and {artifact.v16.counts.api_input} per hosted API ·
        {' '}{artifact.n_ranked} ranked systems · {carryCount} systems retain a separately dated v1.5.x score · only system-level aggregates are published ·
        {' '}<a className="text-accent underline" href="/api/jevbench/v1.6.0">aggregate results JSON</a> · SHA-256 <code>{sha256}</code>
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-jev-version-share-row>
        <a className="text-accent underline" href={sharePath} data-bh-jev-version-share>Share this version</a>
        {!live && <span className="bh-muted"> · <a className="text-accent underline" href="/jev-models" data-bh-jev-live-link>View live board</a></span>}
        <span className="bh-muted"> · Previous release: <a className="text-accent underline" href="/jev-models/v1.5.7">JevBench v1.5.7</a></span>
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-image-jev-link-row>Making decisions from images? <a className="text-accent font-semibold underline" href="/image-jev-bench" data-bh-image-jev-link>Explore Image JevBench and compare its systems</a>.</p>
    </header>
    <JevBenchV16Board artifact={artifact} sha256={sha256} categories={categories} categoriesSha256={categoriesSha256}
      carry={carry} carrySha256={carrySha256} previousKeys={[...previous.artifact.systems, ...previous.artifact.not_measured].map((row: { key: string }) => row.key)} />
  </>;
}
