import type { CSSProperties } from 'react';
import type { JevV15Artifact } from '../lib/jevbench-v15-preview.mjs';
import { jevV15LeaderSentence } from '../lib/jevbench-v15-preview.mjs';
import { jevV15SliderPresets, jevV15BoardSystem, jevV15BoardRow, jevV15CompareRow } from '../lib/jevbench-v15-board.mjs';
import type { JevV16ReleaseArtifact, JevV16Categories, JevV16Carry } from '../lib/jevbench-v16-release.mjs';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { jevV15FilterRows } from '../lib/jevbench-v15-filter-rows.mjs';
import { JevBenchV16Charts } from './JevBenchV16Charts';
import { jevClassView } from './jevClassView';
import { JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
import { JevScoreChart } from './JevBoardInteractive';
import { JevCompareV15 } from './JevCompareV15';
import { JevV15FilterProvider, JevV15FilterPanel, type JevV15RowMeta } from './JevV15Filters';
import { JevV15FilterVisibilityBridge } from './JevV15FilterVisibilityBridge';
import { JevV15AllDataGrid } from './JevV15AllDataGrid';
import { JevApiOfferingsToggle } from './JevApiOfferingsToggle';
import { JevGpuCostCalculator } from './JevGpuCostCalculator';
import { JEV_REFERENCE_KEY, JEV_SCOPE_LISTING, type JevScope } from '../lib/jevbench-scope.mjs';

// JevBench v1.6.0 release board. Reuses the established interactive charts on the
// v1.6 aggregate artifact, and adds the main-pool language view, dated carry and the
// rotation / API-exposure method. Carried v1.5.x rows never enter v1.6 rankings.

const one = (v: number | null | undefined) => v == null ? '—' : v.toFixed(1);
const usd = (v: number | null | undefined) => v == null ? '—' : `$${v.toFixed(4)}`;
const sec = (v: number | null | undefined) => v == null ? '—' : `${v.toFixed(2)} s`;
const short = (display: string) => display.replace(/\s*\(.*\)\s*$/, '');

// v1.7: rows a board lists — its ranked systems plus, on the open-weights board, the Jev reference and the API offerings
// (unranked there). API rows of server-rendered tables carry data-bh-jev-api-row and start hidden; the toggle reveals them.
type ScopedRow = { ranked?: boolean; listing?: string; rank?: number | null; jevbench_score?: number | null };
const listedRow = (s: ScopedRow) => !!s.ranked || s.listing === JEV_SCOPE_LISTING.reference || s.listing === JEV_SCOPE_LISTING.api;
const byBoard = (x: ScopedRow, y: ScopedRow) => (x.rank ?? 999) - (y.rank ?? 999) || (y.jevbench_score ?? 0) - (x.jevbench_score ?? 0);
function apiRowProps(key: string, hiddenApi: ReadonlySet<string>) {
  return hiddenApi.has(key) ? { 'data-bh-jev-api-row': key, hidden: true } : {};
}
function laneTag(s: { key: string; listing?: string; v16: { lane: string } }) {
  if (s.listing === JEV_SCOPE_LISTING.reference) return 'reference · API';
  return s.v16.lane === 'api' ? 'API' : 'self-hosted';
}

function heat(competence: number, lowN: boolean): CSSProperties {
  const t = Math.max(0, Math.min(1, competence / 100));
  // Site heat scale (.bh-heat in globals.css reads --h in 0..1).
  return { ['--h' as string]: t.toFixed(3), opacity: lowN ? 0.6 : 1 } as CSSProperties;
}

function LanguageView({ a, categories, hiddenApi }: { a: JevV16ReleaseArtifact; categories: JevV16Categories; hiddenApi: ReadonlySet<string> }) {
  const systems = a.systems.filter((s) => listedRow(s) && categories.systems[s.key]).sort(byBoard);
  const allLangs = categories.languages.filter((l) => l.key !== 'en').sort((x, y) => y.n - x.n);
  const en = categories.languages.find((l) => l.key === 'en');
  // CR-290 (Florian 5 Oct 2026): a language column in which no system reaches the reporting minimum was all dashes.
  // Those columns are not drawn; their languages and item counts are listed in the caption instead. Display only.
  const shown = (l: { key: string }) => systems.some((s) => (categories.systems[s.key].languages?.[l.key]?.n ?? 0) >= categories.min_n);
  const langs = allLangs.filter(shown);
  const hidden = allLangs.filter((l) => !shown(l));
  return <section className="mt-10" aria-labelledby="jev16-languages" data-bh-jev16-language-view>
    <h2 id="jev16-languages" className="text-2xl font-bold">Languages</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">Raw chance-corrected competence per item language (0 = chance, 100 = perfect; can be negative), from each system&apos;s own measured items:
      self-hosted systems over S 1,200 + P 300, hosted APIs over their A or A2 subset + P (600 items). A2 topic/use-case cells cover P300 only. Unequated and outside the Composite. Cells under {categories.min_n} items are left empty. A dagger (†) marks every displayed cell with fewer than 30 answered items.
      {en ? ` English (${en.n.toLocaleString('en-US')} items) is listed first; the other ${allLangs.filter((l) => l.key !== 'mixed').length} languages${allLangs.some((l) => l.key === 'mixed') ? ' and the mixed-language group' : ''} share ${allLangs.reduce((s, l) => s + l.n, 0)} items.` : ''}
      {hidden.length > 0 && <span data-bh-jev16-language-hidden={hidden.map((l) => l.key).join(' ')}>{' '}In {hidden.length === 1 ? 'one further group' : `${hidden.length} further groups`} no system reaches the {categories.min_n}-item reporting minimum, so {hidden.length === 1 ? 'it gets' : 'they get'} no column (items in the pool shown): {hidden.map((l) => `${l.label} (${l.n})`).join(', ')} — {hidden.reduce((s, l) => s + l.n, 0)} items, scored like every other item.</span>}
      {' '}This is the v1.6.0 main-pool breakdown. Per-language coverage grows with the expanded uc1.1 multilingual pool, a candidate for a later release that is not part of v1.6.0.</p>
    <div className="mt-3 overflow-x-auto"><table className="text-left text-xs tabular" data-bh-jev16-language-table>
      <caption className="sr-only">JevBench v1.6.0 competence by item language and system</caption>
      <thead><tr><th scope="col" className="sticky left-0 bg-[rgb(var(--panel))] p-1.5">System</th>
        {[...(en ? [en] : []), ...langs].map((l) => <th key={l.key} scope="col" className="p-1.5 text-center" title={`${l.label}: ${l.n} items (${l.open} public, ${l.sealed} sealed)`}>{l.key}{l.n < 30 && <sup aria-label="low n">†</sup>}<span className="bh-muted block font-normal">{l.n}</span></th>)}</tr></thead>
      <tbody>{systems.map((s) => <tr key={s.key} className="border-t border-line" {...apiRowProps(s.key, hiddenApi)}>
        <th scope="row" className="sticky left-0 bg-[rgb(var(--panel))] p-1.5 font-normal whitespace-nowrap">{short(s.display)}<span className="bh-muted"> · {laneTag(s)}</span></th>
        {[...(en ? [en] : []), ...langs].map((l) => {
          const c = categories.systems[s.key].languages?.[l.key];
          if (!c || c.n < categories.min_n) {
            const status = c ? `${c.n} answered items; below the ${categories.min_n}-item reporting minimum` : `Not plotted; fewer than ${categories.min_n} answered items`;
            return <td key={l.key} className="p-1.5 text-center bh-muted" title={`${l.label}: ${status}`} aria-label={`${l.label}: ${status}`} data-bh-jev16-language-suppressed>{!c ? '—' : '·'}</td>;
          }
          const lowN = c.n < 30;
          return <td key={l.key} className="bh-heat p-1.5 text-center" style={heat(c.competence, lowN)} title={`${l.label}: ${c.competence.toFixed(1)} over ${c.n} items${lowN ? ' (low n)' : ''}`}>{c.competence.toFixed(0)}{lowN && <sup className="ml-0.5 text-[10px]" aria-label="low n: fewer than 30 answered items">†</sup>}</td>;
        })}
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function DatedCarry({ carry, hiddenApi }: { carry: JevV16Carry; hiddenApi: ReadonlySet<string> }) {
  const byRelease = carry.releases.map((r) => ({ ...r, n: carry.rows.filter((row) => row.measured_revision === r.revision).length })).filter((r) => r.n > 0);
  const shownByDefault = carry.rows.filter((r) => !hiddenApi.has(r.key)).length;
  return <section className="bh-panel mt-10 p-5" aria-labelledby="jev16-carry" data-bh-jev16-dated-carry>
    <h2 id="jev16-carry" className="text-2xl font-bold">Not yet measured on v1.6 · {shownByDefault < carry.rows.length ? `${shownByDefault} open-weights systems` : `${carry.rows.length} systems`} with a dated carried score</h2>
    {shownByDefault < carry.rows.length && <p className="bh-muted mt-1 text-xs">A further {carry.rows.length - shownByDefault} carried rows are hosted API offerings; they appear here when “Show API offerings” is on and are listed on the <a className="text-accent underline" href="/jev-models/api#jev16-carry">API leaderboard</a>.</p>}
    <p className="bh-muted mt-1 max-w-4xl text-sm">{carry.rule} {carry.method}</p>
    <p className="bh-muted mt-1 text-xs">Dates: {byRelease.map((r) => `${r.revision} published ${r.published_on} (${r.n})`).join(' · ')}. The date is the publication day of the release that first published the measurement, not a per-model measurement timestamp.</p>
    <div className="mt-3 max-h-[40rem] overflow-auto"><table className="w-full text-left text-sm tabular">
      <caption className="sr-only">Carried JevBench v1.5.x results, not ranked with v1.6 measurements</caption>
      <thead><tr>{['System', 'Measured on', 'Capability (v1.5 scale)', 'v1.5 Composite', 'Cost / 1,000', 'Median latency'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{carry.rows.map((r) => <tr key={r.key} className="border-t border-line" data-bh-jev16-carry-row={r.key} {...apiRowProps(r.key, hiddenApi)}>
        <th scope="row" className="p-2 font-normal"><a className="text-accent underline" href={r.source_url ?? r.repo ?? undefined}>{r.display}</a>{r.note && <span className="bh-muted block text-xs">{r.note}</span>}</th>
        <td className="p-2 whitespace-nowrap">{r.measured_label}</td>
        <td className="p-2">{one(r.capability)}</td>
        <td className="p-2">{one(r.composite_v15)}{r.v156_rank != null && <span className="bh-muted"> · was #{r.v156_rank} on {r.carried_from}</span>}</td>
        <td className="p-2">{usd(r.cost?.usd_per_1000)}<span className="bh-muted block text-xs">{r.cost?.kind ?? ''}</span></td>
        <td className="p-2">{sec(r.speed.p50_s_adjusted)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

// v1.7.0 (Florian, 5 Oct 2026): open-weights board on /jev-models, API-provider board on /jev-models/api.
export const JEV_BOARD_REVISIONS: { version: string; date: string; text: string }[] = [
  { version: 'v1.7.0', date: '2026-10-05', text: 'Leaderboard split. /jev-models ranks open-weights systems we ran on our own hardware, with Jev 1.13.0 as an unranked reference row and a “Show API offerings” switch; hosted API offerings are ranked on the new /jev-models/api board. No score was recomputed: ranks are the published order filtered to each board. Adds the GPU cost What-If.' },
  { version: 'v1.6.0', date: '2026-10-05', text: 'Rotating sealed item sets, API-exposure rule, Noul decisiveness (method B), language view and dated carry.' },
];

function BoardSplit({ scope }: { scope: JevScope }) {
  return <div data-bh-jev-board-split>
    <h3 className="mt-4 text-lg font-semibold">Open weights and API offerings (board v1.7.0)</h3>
    <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">
      <li>{scope === 'open' ? 'This board' : 'The main board at /jev-models'} ranks <b>open-weights systems</b>: published weights that we ran ourselves, on GPU or CPU machines we rent and operate. A system we measured through an endpoint we do not run (vendor API, author-hosted or third-party-hosted endpoint, for example Qwen3.8 27B via Chutes) is an <b>API offering</b>, even when its base weights are open; API offerings are ranked on {scope === 'api' ? 'this board' : <a className="text-accent underline" href="/jev-models/api">the API leaderboard</a>}.</li>
      <li>Why separate boards: open weights can be compared on equal hosting terms, while an API price is a vendor decision that can be subsidised or raised later and is not reproducible by readers. Every score and measurement is the same on both boards; only the set of ranked rows differs, and ranks are the published order filtered to that set.</li>
      <li>Jev 1.13.0 is a hosted API. It stays on the open-weights board as the <b>reference row</b> (it defines the Jev-class cost and latency caps) and is not ranked there; it is ranked on the API leaderboard.</li>
      <li>Official cost basis is unchanged: the Cost axis keeps each row&apos;s documented reference price (see the cost notes below; APIs with a known base model are priced at the developer&apos;s own list price). {scope === 'open' ? 'The GPU cost calculator above' : 'The GPU cost calculator on the main board'} is a What-If for your own hosting and never changes a score or rank.</li>
    </ul>
    <h3 className="mt-4 text-lg font-semibold">Revision history</h3>
    <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm" data-bh-jev-revision-history>
      {JEV_BOARD_REVISIONS.map((r) => <li key={r.version}><b>{r.version}</b> ({r.date}): {r.text}</li>)}
      <li>Earlier releases: <a className="text-accent underline" href="/jev-models/v1.5.7">v1.5.7</a>, <a className="text-accent underline" href="/jev-models/v1.5.6">v1.5.6</a>, <a className="text-accent underline" href="/jev-models/v1.5.5">v1.5.5</a> and the historical boards below.</li>
    </ul>
  </div>;
}

function Method({ a, sha256, categoriesSha256, carrySha256, scope, hiddenApi }: { a: JevV16ReleaseArtifact; sha256: string; categoriesSha256: string; carrySha256: string; scope: JevScope; hiddenApi: ReadonlySet<string> }) {
  const sets = a.v16.item_sets;
  const off = a.v16.equating.offsets;
  const byDay = new Map<string, string[]>();
  const methodSystems = a.systems.filter((s) => !hiddenApi.has(s.key));
  for (const s of methodSystems) if (s.last_measured_on) byDay.set(s.last_measured_on, [...(byDay.get(s.last_measured_on) ?? []), short(s.display)]);
  const measuredDays = [...byDay.entries()].sort(([x], [y]) => x.localeCompare(y));
  const failures = methodSystems.map((s) => {
    const v = Object.values((s as unknown as { validity?: Record<string, { invalid_rate: number; n: number }> }).validity ?? {});
    return [short(s.display), Math.round(v.reduce((t, c) => t + c.invalid_rate * c.n, 0)), v.reduce((t, c) => t + c.n, 0)] as [string, number, number];
  });
  const confidenceOnly = methodSystems.filter((s) => { const sup = Object.values((s as unknown as { support?: Record<string, string> }).support ?? {}); return sup.length > 0 && sup.every((x) => x === 'confidence'); }).map((s) => short(s.display));
  return <section className="mt-10 max-w-4xl" aria-labelledby="jev16-method" id="jev16-method" data-bh-jev16-method>
    <h2 id="jev16-method" className="text-2xl font-bold">Method · {a.revision}</h2>
    {scope !== 'all' && <BoardSplit scope={scope} />}
    {hiddenApi.size > 0 && <p className="bh-muted mt-2 text-xs" data-bh-jev-method-scope-note>Per-system method lists on this board cover the open-weights systems and the Jev reference; the hosted API offerings&apos; lists are on the <a className="text-accent underline" href="/jev-models/api#jev16-method">API leaderboard</a>.</p>}
    <h3 className="mt-4 text-lg font-semibold">Rotating item sets</h3>
    <p className="bh-muted mt-1 text-sm">Each release draws fresh sealed decisions from a larger reserve. Self-hosted open-weights models (run offline on our own GPU pods or Sandy) answer S and P; externally hosted models answer only the API subset A and P.</p>
    <div className="mt-2 overflow-x-auto"><table className="text-left text-sm tabular" data-bh-jev16-rotation>
      <thead><tr>{['Set', 'Items', 'Choice', 'Noul', 'Score', 'Answered by'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{sets.map((s) => <tr key={s.set} className="border-t border-line"><th scope="row" className="p-2">{s.set} · {s.name}</th><td className="p-2">{s.items.toLocaleString('en-US')}</td>
        <td className="p-2">{s.by_type.choice}</td><td className="p-2">{s.by_type.noul}</td><td className="p-2">{s.by_type.score}</td><td className="p-2">{s.answered_by}</td></tr>)}</tbody>
    </table></div>
    <ul className="bh-muted mt-2 list-disc space-y-1 pl-5 text-sm">
      <li>Self-hosted systems: {a.v16.counts.selfhosted_input.toLocaleString('en-US')} items (S {a.v16.counts.S.toLocaleString('en-US')} + P {a.v16.counts.P}). Hosted APIs: {a.v16.counts.api_input} items (A {a.v16.counts.A} + P {a.v16.counts.P}).</li>
      <li>A sealed item is scored in at most three releases, then retired. An item used in one release is not drawn again in the next. If coverage minimums cannot be met, the release waits for newly reviewed items.</li>
      <li>The selection seed is committed (SHA-256) before any inference, and the draw is a deterministic function of policy, seed and item id.</li>
    </ul>
    <h3 className="mt-4 text-lg font-semibold">API-exposure rule</h3>
    <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">
      <li>An external exposure is any sealed item sent to an endpoint we do not control: closed APIs, and open-weights models reached through third-party hosts, routers or a submitter&apos;s endpoint. Timeouts count as exposure.</li>
      <li>Hosted models receive only the release&apos;s API subset A plus the public set P, and are re-measured at most once every three refresh releases unless a verified new model version ships. Between measurements they keep their last score with its measurement date.</li>
      <li>Every externally sent sealed item is logged before dispatch. An item exposed to a provider is never scored again for that provider; once two different providers have received it, it retires for everyone. In v1.6.0 Jev 1.13.0 and Fastino GLiNER-2.5-Decide both received the same A, so A retires globally.</li>
    </ul>
    <h3 className="mt-4 text-lg font-semibold">Public-versus-sealed gap penalty</h3>
    <p className="bh-muted mt-1 text-sm">Intelligence is half public, half sealed. A system whose public score exceeds its sealed score by more than the field-median gap (G_med = {one(a.G_med)} points{a.G_med_flag_gt10 ? ', flagged above 10' : ''}) plus 8 points loses one Intelligence point per excess point. Hosted APIs are compared on P versus A against the same self-hosted systems&apos; P-versus-A gap ({one(a.G_med_api_basis_P_vs_A)} points).</p>
    <h3 className="mt-4 text-lg font-semibold">Comparable scores for hosted APIs</h3>
    <p className="bh-muted mt-1 text-sm">{a.v16.equating.rule.charAt(0).toUpperCase() + a.v16.equating.rule.slice(1)}. Offsets in this run: Intelligence {off.I >= 0 ? '+' : ''}{off.I.toFixed(2)}, Calibration {off.C >= 0 ? '+' : ''}{off.C.toFixed(2)}. {a.v16.equating.pool_note} Category and language values stay raw and unequated.</p>
    <h3 className="mt-4 text-lg font-semibold">Headline and Composite</h3>
    <p className="bh-muted mt-1 text-sm">Capability = mean(Intelligence, Calibration) for systems within twice the Jev 1.13.0 cost and median latency (the official caps; the sliders change only your view). The Composite (option {a.headline}) is the equal-weight harmonic mean of Intelligence, Calibration, Speed and Cost with the v1.5 low-axis gates; it remains secondary. Request types Choice, Noul and Score weigh equally; tiers weigh easy {a.tier_weights.easy}, standard {a.tier_weights.standard}, hard {a.tier_weights.hard}, judge {a.tier_weights.judge}.</p>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-class-reference>Jev-class caps use a fixed reference: Jev 1.13.0 as measured in v1.5 (p50 0.62 s, USD 0.0323 per 1k answers); caps = 2x (1.23 s, USD 0.0646). Jev&apos;s own v1.6 p50 is 0.24 s.</p>
    <p id="jev-costs" className="bh-muted mt-1 text-sm">Costs of v1.6-measured systems carry each system&apos;s published v1.5.4 cost per 1,000 decisions (pricing rules unchanged; v1.6 item lengths differ) unless the row says otherwise; Fastino&apos;s is an estimate from its published tariff and measured tokens.</p>
    {a.noul_method?.applied === 'O1S' && <>
    <h3 className="mt-4 text-lg font-semibold">Noul decisiveness and Score baseline (addendum B)</h3>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-noul-method>Scored with method option B (scorer setting {a.noul_method?.applied ?? 'O0'}), selected on 3 Oct 2026 after the v1.6 scores were known and disclosed as a post-results change. Each split × type competence is clipped at 0 before the type weighting, so a type answered no better than chance counts as chance instead of negative. The Score chance baseline is the error of always predicting the mid-scale level, so a flat know-nothing distribution earns about 0. A Score cell whose golds all sit at mid-scale keeps the v1.5 random-level baseline; this only occurs in small breakdown and bootstrap cells. Calibration is unchanged. This run: G_med = {a.G_med == null ? "—" : a.G_med.toFixed(2)} points; hosted-API offsets Intelligence {off.I >= 0 ? '+' : ''}{off.I.toFixed(2)}, Calibration {off.C >= 0 ? '+' : ''}{off.C.toFixed(2)}.</p>
    </>}
    <h3 className="mt-4 text-lg font-semibold">Failed requests and very long items</h3>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-failures>{a.v16.long_items_note} A failed, refused or unparseable answer counts as wrong for Intelligence and stays in the denominator; it does not enter Calibration (the v1.5 rule, applied to every system).
      {' '}Failed answers per system: {failures.map(([name, n, total]) => `${name} ${n}/${total}`).join(' · ')}.</p>
    <h3 className="mt-4 text-lg font-semibold">Calibration basis</h3>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-calibration-basis>Systems that return a full probability distribution are calibrated on all components (top-label error, plus distribution distance for Choice and ranked-probability error for Score).
      {confidenceOnly.length > 0 ? ` ${confidenceOnly.join(', ')} return${confidenceOnly.length === 1 ? 's' : ''} a single confidence value, so ${confidenceOnly.length === 1 ? 'its' : 'their'} Calibration is the top-label error only and is not like-for-like with full-distribution systems.` : ''}</p>
    {(a as unknown as { overnight?: OvernightNotes }).overnight && <Overnight o={(a as unknown as { overnight: OvernightNotes }).overnight} hiddenApi={hiddenApi} />}
    <h3 className="mt-4 text-lg font-semibold">Provenance</h3>
    {measuredDays.length > 0 && <p className="bh-muted mt-1 text-sm" data-bh-jev16-measured-days>Measured on the v1.6 pool (run completion day, UTC): {measuredDays.map(([day, names]) => `${day}: ${names.join(', ')}`).join(' · ')}.</p>}
    <p className="bh-muted mt-1 break-all text-xs">Aggregate files: results sha256 {sha256} · categories sha256 {categoriesSha256} · dated carry sha256 {carrySha256}. Scoring source sha256 {a.source_sha256}. The method, release data and carry artifact are independently hashable.</p>
  </section>;
}

type OvernightNotes = { round: string; scored_utc: string; a2_note?: string | null; notes?: string[];
  exposure?: Record<string, { display?: string; sealed_items_exposed?: number; draws?: string; note?: string }> };

function Overnight({ o, hiddenApi }: { o: OvernightNotes; hiddenApi: ReadonlySet<string> }) {
  const exp = Object.entries(o.exposure ?? {})
    // Every exposure entry is a hosted endpoint (keys can name a mode, e.g. wity-1-auto); the open board keeps only the Jev reference.
    .filter(([key]) => !hiddenApi.size || key === JEV_REFERENCE_KEY);
  return <div data-bh-jev16-overnight-method>
    <h3 className="mt-4 text-lg font-semibold">Overnight full re-measure (4–5 Oct 2026)</h3>
    <p className="bh-muted mt-1 text-sm">Every system with a reproducible recipe was re-run on the v1.6.0 pool overnight with the same pinned inputs and scorer (method option B / O1S). This page uses scoring round {o.round} ({o.scored_utc}). Only complete runs (1,500 items self-hosted, the full API input for hosted APIs) are ranked; partial runs are never ranked, and systems not yet re-measured keep their dated v1.5.x score in the separate table.</p>
    {o.notes && o.notes.length > 0 && <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">{o.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
    {o.a2_note && <><h3 className="mt-4 text-lg font-semibold">Supplementary API draws A2 and A3</h3><p className="bh-muted mt-1 text-sm" data-bh-jev16-a2>{o.a2_note}</p></>}
    {exp.length > 0 && <><h3 className="mt-4 text-lg font-semibold">Per-model exposure counts (hosted and author-hosted endpoints)</h3>
      <div className="mt-2 overflow-x-auto"><table className="text-left text-sm tabular" data-bh-jev16-exposure>
        <thead><tr>{['System (provider)', 'v1.6 sealed items sent', 'Scored sealed set', 'Status'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
        <tbody>{exp.map(([k, e]) => <tr key={k} className="border-t border-line"><th scope="row" className="p-2 font-normal">{e.display ?? k}</th>
          <td className="p-2">{e.sealed_items_exposed ?? '—'}</td><td className="p-2">{e.draws ?? '—'}</td><td className="p-2 bh-muted">{e.note ?? ''}</td></tr>)}</tbody>
      </table></div></>}
  </div>;
}

const pct = (v: number | null | undefined) => v == null ? '—' : `${Math.round(v * 100)} %`;
const TYPES = ['choice', 'noul', 'score'] as const;

// Display rules of the adopted method addendum B: decisive rate per row, "not supported" instead of a number for an
// unsupported request type, and Intelligence values under the gate shown with a "below gate" label instead of 0.
function NoulAndGate({ a, hiddenApi }: { a: JevV16ReleaseArtifact; hiddenApi: ReadonlySet<string> }) {
  const rows = a.systems.filter(listedRow).sort(byBoard);
  return <section className="mt-10" aria-labelledby="jev16-noul" data-bh-jev16-noul-gate>
    <h2 id="jev16-noul" className="text-2xl font-bold">Intelligence gate and Noul decisiveness</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">The Composite applies a soft gate below Intelligence 50 (× (I/50)²). Rows under it show their value with a &quot;below gate&quot; label. The decisive rate is the share of valid Noul answers with P(yes) ≥ 0.80 or ≤ 0.20 (for systems that return only a label, every valid label counts as decisive); only decisive answers count as answers. Accuracy among decisive answers is a diagnostic and does not enter any score.</p>
    <div className="mt-3 overflow-x-auto"><table className="text-left text-sm tabular" data-bh-jev16-noul-table>
      <thead><tr>{['System', 'Intelligence', 'Choice', 'Noul', 'Score', 'Noul decisive rate', 'Accuracy among decisive'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{rows.map((s) => {
        const I = s.axes.intelligence;
        const support = (s as unknown as { support?: Record<string, string> }).support ?? {};
        const d = s.noul_decisive;
        return <tr key={s.key} className="border-t border-line" {...apiRowProps(s.key, hiddenApi)}>
          <th scope="row" className="p-2 font-normal whitespace-nowrap">{short(s.display)}{s.listing === JEV_SCOPE_LISTING.reference && <span className="bh-muted"> · reference</span>}</th>
          <td className="p-2">{one(I)}{I != null && I < 50 && <span className="bh-muted ml-1 text-xs" data-bh-below-gate>below gate</span>}</td>
          {TYPES.map((t) => <td key={t} className="p-2">{(support[t] ?? 'unsupported') === 'unsupported' ? <span className="bh-muted">not supported</span> : support[t]}</td>)}
          <td className="p-2">{d && d.supported ? pct(d.decisive_rate) : <span className="bh-muted">not supported</span>}</td>
          <td className="p-2">{d && d.supported ? pct(d.acc_among_decisive) : '—'}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </section>;
}

export function JevBenchV16Board({ artifact: a, sha256, categories, categoriesSha256, carry, carrySha256, previousKeys, scope = 'all', apiKeys = [] }: {
  artifact: JevV16ReleaseArtifact; sha256: string; categories: JevV16Categories; categoriesSha256: string; carry: JevV16Carry; carrySha256: string; previousKeys: string[];
  /** v1.7: 'open' = open-weights board with the API toggle, 'api' = API leaderboard, 'all' = archived release as published. */
  scope?: JevScope; apiKeys?: string[];
}) {
  const v15 = a as unknown as JevV15Artifact; // same per-system aggregate schema (score_v16 extends score_v15)
  const ranked = (scope === 'all' ? a.systems.filter((s) => s.ranked) : a.systems.filter(listedRow)).sort(byBoard);
  const hiddenApi: ReadonlySet<string> = new Set(scope === 'open' ? apiKeys : []);
  const chartSystems = ranked.map((s) => jevV15BoardSystem(s) as JevV14System);
  const allChartSystems = a.systems.map((s) => jevV15BoardSystem(s) as JevV14System);
  const allClass = jevClassView(allChartSystems, JEV_V16_CLASS_OPTIONS);
  const eligibilityByKey = new Map(allClass.rows.map((row) => [row.row.key, {
    status: (row.inClass ? 'eligible' : 'outside') as 'eligible' | 'outside',
    reason: row.reasons.length ? row.reasons.join('; ') : 'within the official Jev-class caps',
  }]));
  const filterProjection = jevV15FilterRows(v15, { previousKeys, eligibilityByKey, revisionHref: '/jev-models' });
  const filterRows: JevV15RowMeta[] = filterProjection.map((row) => ({
    key: row.key, display: row.display, provider: row.provider, family: row.family, modelClass: row.modelType,
    open: row.openStatus === 'yes' || row.openStatus === 'weights' || row.openStatus === 'no' ? row.openStatus : 'unknown',
    api: row.api, newInVersion: row.newInVersion, parameters: row.parametersB, licence: row.licence,
    developerPrice: row.apiPricePer1000, basePrice: row.basePricePer1000, officialCost: row.costPer1000, alternativePrice: row.alternativePricePer1000,
    p50: row.p50, p95: row.p95, jevClass: { status: row.eligibility, reason: row.eligibilityReason },
  }));
  const allDataKeys = [...new Set([...a.systems, ...a.not_measured].map((row) => row.key))];
  const previous = new Set(previousKeys);
  const viewRows = ranked.map((s) => jevV15BoardRow(s, { isNew: previous.size > 0 && !previous.has(s.key), headline: a.headline }));
  const compareRows = ranked.map(jevV15CompareRow);
  const named = new Map(a.systems.map((s) => [s.key, short(s.display)]));
  const leader = jevV15LeaderSentence(v15.board[a.headline], (key) => named.get(key) ?? key);
  return <JevV15FilterProvider rows={filterRows} apiKeys={scope === 'open' ? apiKeys : undefined}>
    <section data-bh-jevbench-v16-release data-bh-jev-scope={scope}>
      <JevV15FilterVisibilityBridge />
      {scope === 'open' && <JevApiOfferingsToggle measured={a.systems.filter((s) => (s as { scope?: string }).scope === 'api').length} />}
      <JevBenchV16Charts systems={chartSystems} eligibilitySystems={allChartSystems} revision={a.revision} officialHref="#jev16-method" />
      <JevV15FilterPanel />
      <JevScoreChart revision={a.revision} rows={viewRows} rankedCount={a.n_ranked} newLabel={null} fairness={null} approvedNote={leader} tieNote={null} capabilityHref="#jev-capability" presets={jevV15SliderPresets(v15)} compactMobile scoreKind="v15" methodLink={{ href: '#jev16-method', label: 'Method notes ↓' }} />
      <JevCompareV15 rows={compareRows} openDecisions={a.v16.counts.P} sealedDecisions={a.v16.counts.S} categories={jevbenchCategoryView(a.revision, compareRows.map((r) => r.key))} />
      <p className="bh-muted mt-2 max-w-4xl text-xs" data-bh-jev16-radar-note>{categories.lane_note} Sealed counts in the compare view refer to self-hosted systems (S {a.v16.counts.S.toLocaleString('en-US')}); hosted APIs answered A {a.v16.counts.A}.</p>
      <LanguageView a={a} categories={categories} hiddenApi={hiddenApi} />
      <NoulAndGate a={a} hiddenApi={hiddenApi} />
      <JevV15AllDataGrid
        artifact={v15}
        categoryView={jevbenchCategoryView(a.revision, allDataKeys)}
        previousKeys={previousKeys}
        eligibility={allClass}
        metadata={null}
        links={{ method: '#jev16-method', pricing: '#jev16-method', revisionNotes: '#jev16-method', addenda: {} }}
      />
      {scope === 'open' && <div className="mt-10"><JevGpuCostCalculator systems={ranked.filter((s) => s.v16.lane !== 'api').map((s) => ({
        key: s.key, display: short(s.display), gpu: (s as { gpu?: string | null }).gpu ?? null, p50_s_raw: s.speed?.p50_s_raw ?? null,
        officialUsdPer1000: s.cost?.usd_per_1000 ?? null, ranked: !!s.ranked }))} /></div>}
      <DatedCarry carry={carry} hiddenApi={hiddenApi} />
      <Method a={a} sha256={sha256} categoriesSha256={categoriesSha256} carrySha256={carrySha256} scope={scope} hiddenApi={hiddenApi} />
    </section>
  </JevV15FilterProvider>;
}
