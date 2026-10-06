import { isJevbenchV16ExcludedKey } from '../lib/jevbench-v16-public-scope.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevApiOfferingKeys, jevApiRoster, jevbenchScopeArtifact, jevbenchScopeCarry, jevScopeClassifier, jevWithApiA4Rows, type JevScope } from '../lib/jevbench-scope.mjs';
import apiA4 from '../data/jevbench-api-a4-equated.json';
import { JevBenchV16Board, JEV_BOARD_REVISIONS } from './JevBenchV16Board';
import { JevBenchReleaseVersionNav } from './JevBenchReleaseVersionNav';

type ReleaseData = Awaited<ReturnType<typeof readJevbenchV161Release>>;

export async function JevBenchV16ReleaseRoute({ live = false, release, versionPath, scope = 'all' }: {
  live?: boolean; release?: ReleaseData; versionPath?: string;
  /** v1.7: 'open' on /jev-models, 'api' on /jev-models/api, 'all' on the archived release page. */
  scope?: JevScope;
}) {
  const [{ artifact: release_, sha256, categories, categoriesSha256, carry: releaseCarry, carrySha256 }, previous] = await Promise.all([
    release ? Promise.resolve(release) : readJevbenchV161Release(), readJevbenchV157Release(),
  ]);
  // v1.7.7 (Florian 6 Oct 2026, Part 12b): on the live boards the API lane's full A4 u P re-run rows (equated) join the
  // release as measured API offerings and leave the dated carry; archived release pages show the release as published.
  const a4Meta = new Map<string, unknown>([...previous.artifact.systems, ...releaseCarry.rows].map((r) => [r.key, r]));
  const merged = scope === 'all' || release_.revision !== 'v1.6.1' ? release_ : jevWithApiA4Rows(release_, apiA4, a4Meta) as typeof release_;
  const a4Keys = new Set(merged.systems.map((s) => s.key));
  const published = merged === release_ ? release_ : { ...merged, not_measured: merged.not_measured.filter((r) => !a4Keys.has(r.key)) };
  const publishedCarry = merged === release_ ? releaseCarry : { ...releaseCarry, rows: releaseCarry.rows.filter((r) => !a4Keys.has(r.key)) };
  const revision = published.revision as 'v1.6.0' | 'v1.6.1';
  const previousRelease = revision === 'v1.6.1' ? 'v1.6.0' : 'v1.5.7';
  const previousHref = revision === 'v1.6.1' ? '/jev-models/v1.6.0' : '/jev-models/v1.5.7';
  const allApiFull = published.systems.filter((system) => system.v16.lane === 'api').every((system) => system.v16.full_set_api === true);
  const publishedKeys = new Set([...published.systems, ...published.not_measured, ...publishedCarry.rows].map((row) => row.key));
  const missingPrevious = [...previous.artifact.systems, ...previous.artifact.not_measured]
    .filter((row) => !isJevbenchV16ExcludedKey(row.key) && !publishedKeys.has(row.key));
  if (missingPrevious.length) throw new Error(`JevBench ${revision} catalogue omits public prior rows: ${missingPrevious.map((row) => row.key).join(', ')}`);
  const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const artifact = jevbenchScopeArtifact(published, scope, isApi);
  const carry = jevbenchScopeCarry(publishedCarry, scope === 'api' ? 'api' : 'all', isApi);
  const apiKeys = scope === 'open' ? jevApiOfferingKeys([...published.systems, ...published.not_measured, ...publishedCarry.rows], isApi) : [];
  const carryCount = carry.rows.filter((row) => !apiKeys.includes(row.key)).length;
  const apiItems = allApiFull ? artifact.v16.counts.selfhosted_input.toLocaleString('en-US') : artifact.v16.counts.api_input;
  const sharePath = versionPath ?? (scope === 'api' ? '/jev-models/api' : live ? '/jev-models' : `/jev-models/${revision}`);
  const rankedSelfHosted = artifact.systems.filter((s) => s.ranked && s.v16.lane !== 'api').length;
  const rankedApi = artifact.systems.filter((s) => s.ranked && s.v16.lane === 'api').length;
  // v1.7.1: catalogue-only API rows (wrappers, partial runs, not yet measured) for the roster on /jev-models/api.
  const apiListed = scope === 'api' ? jevApiRoster(artifact, carry.rows, previous.artifact.systems, previous.artifact.revision as string).listed : [];

  return <>
    <JevBenchReleaseVersionNav active={revision} />
    <header className="bh-page-head" data-bh-jev16-release-header data-bh-jev16-live={live ? 'true' : undefined} data-bh-jev-board-scope={scope}>
      <div className="bh-eyebrow flex flex-nowrap items-center" data-bh-jev-frozen-version>
        Official JevBench {revision}{scope !== 'all' && ` · board ${JEV_BOARD_REVISIONS[0].version}`}
      </div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{scope === 'api' ? 'JevBench API leaderboard: hosted decision APIs'
        : live ? 'JevBench by Benchmark Heaven' : `JevBench ${revision} — Jev alternatives ranking`}</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark</b> for Jev-class decision models: state and a bounded rubric in, a typed answer out.</p>
      {scope === 'open' && <p className="mt-3 max-w-3xl text-base" data-bh-jev-scope-intro>This main board ranks <b>open-weights</b> decision models from published weights that we ran ourselves. <b>Jev 1.13.0</b> (TypeSafe) is the only API model kept on this board, as the unranked reference row that defines the genre.</p>}
      {/* v1.7.1 (Florian 6 Oct 2026): one expandable sentence on why the boards are split, with the link and the toggle. */}
      {scope === 'open' && <div className="mt-2 max-w-3xl text-base" data-bh-jev-split-why>
        <p><b>Why open weights and API offerings are separate:</b> open-weights models compare on equal hardware terms, so hosted APIs (Jev, wity, Sage, Fastino, …) have their own <a className="text-accent font-semibold underline" href="/jev-models/api" data-bh-jev-api-board-link>JevBench API leaderboard</a>, and “Show API offerings” below mixes them back in.</p>
        <details className="mt-1" data-bh-jev-split-why-more><summary className="cursor-pointer text-sm text-accent">Read why</summary>
        <ul className="bh-muted mt-2 list-disc space-y-1 pl-5 text-sm">
          <li><b>Fair cost and speed.</b> We run every open-weights model on hardware we rent and operate, so cost and latency compare on the same terms. The GPU cost calculator below prices your own setup: own hardware, on-demand or long-term rental.</li>
          <li><b>API prices can change.</b> An API price is the vendor&apos;s decision. It can be subsidised (for example on top-end GPUs) and raised later, and readers cannot reproduce it.</li>
          <li><b>Different fairness needs.</b> A hosted endpoint chooses its own hardware and sees the benchmark inputs, so API offerings are compared with each other on their own board.</li>
          <li><b>Open-source focus.</b> JevBench exists to make open decision models comparable and reproducible. The API board stays one click away, and every score and the method are identical on both boards.</li>
        </ul>
      </details></div>}
      {scope === 'api' && <p className="mt-3 max-w-3xl text-base" data-bh-jev-scope-intro>This board ranks <b>hosted API offerings</b>: decision APIs and models we reached through an endpoint we do not run. The <b>JevBench Composite Score</b> is the headline here: an API has one public price and one endpoint speed, so all four axes compare directly (on open weights both depend on your hardware, so Capability leads there). Open-weights models are ranked on the <a className="text-accent font-semibold underline" href="/jev-models" data-bh-jev-open-board-link>main JevBench board</a>; every score is identical on both boards.</p>}
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        Release {revision} · {artifact.v16.counts.selfhosted_input.toLocaleString('en-US')} decisions per self-hosted system and {apiItems} per hosted API ·
        {' '}{scope === 'open' ? `${rankedSelfHosted} ranked open-weights systems` : scope === 'api' ? `${rankedApi} ranked API offerings` : `${artifact.n_ranked} ranked systems`} · {carryCount} systems retain a separately dated v1.5.x score · only system-level aggregates are published ·
        {' '}<a className="text-accent underline" href={`/api/jevbench/${revision}`}>aggregate results JSON</a> · SHA-256 <code className="break-all">{sha256}</code>
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-jev-version-share-row>
        <a className="text-accent underline" href={sharePath} data-bh-jev-version-share>Share this {scope === 'api' ? 'board' : 'version'}</a>
        {!live && scope !== 'api' && <span className="bh-muted"> · <a className="text-accent underline" href="/jev-models" data-bh-jev-live-link>View live board</a></span>}
        {scope === 'all' && <span className="bh-muted"> · <a className="text-accent underline" href="/jev-models/api">API leaderboard</a></span>}
        <span className="bh-muted"> · Previous release: <a className="text-accent underline" href={previousHref}>JevBench {previousRelease}</a></span>
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-image-jev-link-row>Making decisions from images? <a className="text-accent font-semibold underline" href="/image-jev-bench" data-bh-image-jev-link>Explore Image JevBench v0.1.5 and compare its systems</a>.</p>
    </header>
    <JevBenchV16Board artifact={artifact} sha256={sha256} categories={categories} categoriesSha256={categoriesSha256}
      carry={carry} carrySha256={carrySha256} scope={scope} apiKeys={apiKeys} apiListed={apiListed}
      previousKeys={[...previous.artifact.systems, ...previous.artifact.not_measured].filter((row: { key: string }) => !isJevbenchV16ExcludedKey(row.key)).map((row: { key: string }) => row.key)} />
  </>;
}
