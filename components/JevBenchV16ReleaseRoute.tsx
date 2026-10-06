import { isJevbenchV16ExcludedKey } from '../lib/jevbench-v16-public-scope.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { JevBenchV16Board } from './JevBenchV16Board';
import { JevBenchReleaseVersionNav } from './JevBenchReleaseVersionNav';

type ReleaseData = Awaited<ReturnType<typeof readJevbenchV161Release>>;

export async function JevBenchV16ReleaseRoute({ live = false, release, versionPath }: {
  live?: boolean; release?: ReleaseData; versionPath?: string;
}) {
  const [{ artifact, sha256, categories, categoriesSha256, carry, carrySha256 }, previous] = await Promise.all([
    release ? Promise.resolve(release) : readJevbenchV161Release(), readJevbenchV157Release(),
  ]);
  const revision = artifact.revision as 'v1.6.0' | 'v1.6.1';
  const previousRelease = revision === 'v1.6.1' ? 'v1.6.0' : 'v1.5.7';
  const previousHref = revision === 'v1.6.1' ? '/jev-models/v1.6.0' : '/jev-models/v1.5.7';
  const apiItems = artifact.v16.counts.api_input;
  const allApiFull = artifact.systems.filter((system) => system.v16.lane === 'api').every((system) => system.v16.full_set_api === true);
  const ranked = artifact.systems.filter((system) => system.ranked);
  const carryCount = carry.rows.length;
  const publishedKeys = new Set([...artifact.systems, ...artifact.not_measured, ...carry.rows].map((row) => row.key));
  const missingPrevious = [...previous.artifact.systems, ...previous.artifact.not_measured]
    .filter((row) => !isJevbenchV16ExcludedKey(row.key) && !publishedKeys.has(row.key));
  if (missingPrevious.length) throw new Error(`JevBench ${revision} catalogue omits public prior rows: ${missingPrevious.map((row) => row.key).join(', ')}`);
  const sharePath = versionPath ?? (live ? '/jev-models' : `/jev-models/${revision}`);

  return <>
    <JevBenchReleaseVersionNav active={revision} />
    <header className="bh-page-head" data-bh-jev16-release-header data-bh-jev16-live={live ? 'true' : undefined}>
      <div className="bh-eyebrow flex flex-nowrap items-center" data-bh-jev-frozen-version>
        Official JevBench {revision}
      </div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{live ? 'JevBench by Benchmark Heaven' : `JevBench ${revision} — Jev alternatives ranking`}</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark</b> for Jev-class decision models: state and a bounded rubric in, a typed answer out.</p>
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        Release {revision} · {artifact.v16.counts.selfhosted_input.toLocaleString('en-US')} decisions per self-hosted system and {allApiFull ? artifact.v16.counts.selfhosted_input.toLocaleString('en-US') : apiItems} per hosted API ·
        {' '}{artifact.n_ranked} ranked systems · {carryCount} systems retain a separately dated v1.5.x score · only system-level aggregates are published ·
        {' '}<a className="text-accent underline" href={`/api/jevbench/${revision}`}>aggregate results JSON</a> · SHA-256 <code className="break-all">{sha256}</code>
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-jev-version-share-row>
        <a className="text-accent underline" href={sharePath} data-bh-jev-version-share>Share this version</a>
        {!live && <span className="bh-muted"> · <a className="text-accent underline" href="/jev-models" data-bh-jev-live-link>View live board</a></span>}
        <span className="bh-muted"> · Previous release: <a className="text-accent underline" href={previousHref}>JevBench {previousRelease}</a></span>
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-image-jev-link-row>Making decisions from images? <a className="text-accent font-semibold underline" href="/image-jev-bench" data-bh-image-jev-link>Explore Image JevBench v0.1.5 and compare its systems</a>.</p>
    </header>
    <JevBenchV16Board artifact={artifact} sha256={sha256} categories={categories} categoriesSha256={categoriesSha256}
      carry={carry} carrySha256={carrySha256} previousKeys={[...previous.artifact.systems, ...previous.artifact.not_measured].filter((row: { key: string }) => !isJevbenchV16ExcludedKey(row.key)).map((row: { key: string }) => row.key)} />
  </>;
}
