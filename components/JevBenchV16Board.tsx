import { hasApiFullAddendumCategories } from '../lib/jevbench-api-full-addenda.mjs';
import { COMPOSITE_DEFINITION } from '../lib/decision-benchmark-manifest.mjs';
import spokeExceptions from '../data/jevbench-radar-spoke-exceptions.json';
import { Fragment } from 'react';
import { languageRoster } from '../lib/jevbench-language-roster.mjs';
import { JevArchitectureMethod } from './JevArchitecture';
import type { CSSProperties } from 'react';
import type { JevV15Artifact } from '../lib/jevbench-v15-preview.mjs';
import { jevV15LeaderSentence } from '../lib/jevbench-v15-preview.mjs';
import { jevV15SliderPresets, jevV15BoardSystem, jevV15BoardRow, jevV15CompareRow } from '../lib/jevbench-v15-board.mjs';
import type { JevV16ReleaseArtifact, JevV16Categories, JevV16Carry } from '../lib/jevbench-v16-release.mjs';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { JEVBENCH_LANGUAGE_META, jevLanguageRows, languagePoolNote, jevbenchCategoryView, isFreshJevbenchV16Revision, freshJevbenchCategoryRows, JEVBENCH_S_CATEGORY_CELLS_ARTIFACT, L3_EXPOSURE_NOTES } from '../lib/jevbench-categories.mjs';
import { jevV15FilterRows } from '../lib/jevbench-v15-filter-rows.mjs';
import { JevBenchV16Charts } from './JevBenchV16Charts';
import { jevClassView } from './jevClassView';
import { JEV_V16_CLASS_OPTIONS, JEV_V16_FROZEN_LIMITS } from '../lib/jevbench-jev-class.mjs';
import { JevScoreChart } from './JevBoardInteractive';
import { JevCompareV15 } from './JevCompareV15';
import { JevV15FilterProvider, JevV15FilterPanel, type JevV15RowMeta } from './JevV15Filters';
import { JevV15FilterVisibilityBridge } from './JevV15FilterVisibilityBridge';
import { baseModelFamilies } from '../lib/jev-base-model.mjs';
import { JevV15AllDataGrid } from './JevV15AllDataGrid';
import { JevApiOfferingsToggle } from './JevApiOfferingsToggle';
import { JevGpuCostCalculator } from './JevGpuCostCalculator';
import { jevScopeClassifier, JEV_PENDING_LISTING, JEV_PRELIMINARY_LISTING, JEV_REFERENCE_KEY, JEV_SCOPE_LISTING, jevApiPreliminaryRows, jevApiRoster, jevScopeDisplayOrder, type JevApiListedRow, type JevScope } from '../lib/jevbench-scope.mjs';
import { NOT_RANKED } from './JevBoardShared';
import { apiRerunCells } from '../lib/jevbench-api-rerun-cells.mjs';
import apiPublicSet from '../data/jevbench-api-public-set.json';
import apiA4 from '../data/jevbench-api-a4-equated.json';

// JevBench v1.6.0 release board. Reuses the established interactive charts on the
// v1.6 aggregate artifact, and adds the main-pool language view, dated carry and the
// rotation / API-exposure method. Carried v1.5.x rows never enter v1.6 rankings.

const spokeReason = (key: string) => spokeExceptions.find((e) => e.key === key)?.reason;
const exposureNote = (key: string) => (L3_EXPOSURE_NOTES as Record<string, string>)[key];
const one = (v: number | null | undefined) => v == null ? '—' : v.toFixed(1);
const usd = (v: number | null | undefined) => v == null ? '—' : `$${v.toFixed(4)}`;
const sec = (v: number | null | undefined) => v == null ? '—' : `${v.toFixed(2)} s`;
const short = (display: string) => display.replace(/\s*\(.*\)\s*$/, '');
// Review 6 Oct 2026: variants share a short name ("GPT-6 Luna", "wity-1"); texts that list systems by name keep the full display for those.
const nameLabel = (display: string, all: ReadonlyArray<{ display: string }>) => all.filter((x) => short(x.display) === short(display)).length > 1 ? display : short(display);
const API_CATEGORY_POOLS = [...new Set(Object.values(apiRerunCells.systems as Record<string, { category_pools: string }>).map((r) => r.category_pools))].sort().join('; ');
const A4_OFFSETS = (apiA4 as { a4_offsets: { I: number; C: number } }).a4_offsets;
const A4_ROWS = (apiA4 as { rows: Array<{ key: string; listing: string; n_rows: number }> }).rows.length;
const A4_RANKED = (apiA4 as { rows: Array<{ key: string; listing: string; n_rows: number }> }).rows.filter((r) => r.listing === 'ranked').length;
// Review 6 Oct 2026: most ranked API rows are A4 u P re-runs and are equated; the frozen v1.6.1 text says hosted APIs are not.
const A4_FULL = ((apiA4 as { full_rows?: { display: string }[] }).full_rows ?? []).map((row) => row.display);
// v1.7.10: rows re-run later on the fresh sealed subset A5 u P (OpenAI Decisions), equated with A5's own offsets.
const A5 = (apiA4 as { a5?: { a5_offsets: { I: number; C: number } } }).a5;
const A5_ROWS = ((apiA4 as { a5_rows?: { display: string }[] }).a5_rows ?? []).map((row) => row.display);
const A5_TEXT = A5 && A5_ROWS.length ? ` ${A5_ROWS.join(', ')} ran later on the fresh sealed API set A5 ∪ P (600 items; A4 had already been sent to that provider) and is equated the same way with A5's own offsets (+${A5.a5_offsets.I.toFixed(2)} Intelligence, +${A5.a5_offsets.C.toFixed(2)} Calibration, same pool).` : '';
const A4_EXCEPTION = `Exception since v1.7.7: the ${A4_RANKED} API rows re-run on A4 ∪ P (600 items) are equated (+${A4_OFFSETS.I.toFixed(2)} Intelligence, +${A4_OFFSETS.C.toFixed(2)} Calibration); see “Full API re-run (A4, v1.7.7)” under Open weights and API offerings. Full-set API rows (Jev, Sage, wity-1, Fastino GLiNER-2.5-Decide${A4_FULL.length ? `, ${A4_FULL.join(', ')}` : ''}) are not equated.${A5_TEXT}`;

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

// v1.7.12: which item pools a row's category cells cover (S+P, S+P+L1 or S+P+L1+L2).
function coverageOf(categories: JevV16Categories, key: string) {
  return (categories.systems[key] as unknown as { language_coverage?: string; coverage?: string } | undefined)?.language_coverage ?? (categories.systems[key] as unknown as { coverage?: string } | undefined)?.coverage ?? (categories.language_cells ? 'not measured' : 'S+P');
}

// A row-scoped disclosure published with the row's language cells (how its coverage was completed).
function languageNoteOf(categories: JevV16Categories, key: string) {
  return (categories.systems[key] as unknown as { language_coverage_note?: string } | undefined)?.language_coverage_note;
}

// CR-320: a low-n cell's shade is dimmed in CSS ([data-bh-heat-low-n]); opacity here also faded the number below 4.5:1.
const completedLanguageN = (cell: { n: number; coverage_n?: number }) => cell.coverage_n ?? cell.n;

function heat(competence: number): CSSProperties {
  const t = Math.max(0, Math.min(1, competence / 100));
  // Site heat scale (.bh-heat in globals.css reads --h in 0..1).
  return { ['--h' as string]: t.toFixed(3) } as CSSProperties;
}

function LanguageView({ a, categories, hiddenApi, scope, carry }: { carry: JevV16Carry; scope: JevScope; a: JevV16ReleaseArtifact; categories: JevV16Categories; hiddenApi: ReadonlySet<string> }) {
  const systems = ['v1.6.3', 'v1.6.4'].includes(a.revision) ? freshJevbenchCategoryRows(a.systems.filter(s => categories.systems[s.key])) : categories.language_cells ? jevLanguageRows(languageRoster(a.systems, a.not_measured, carry.rows, categories.systems, jevScopeClassifier(a.systems, carry.rows, a.not_measured), scope), scope) : a.systems.filter((s) => listedRow(s) && categories.systems[s.key]).sort(byBoard);
  const belowRanking = (s: { listing?: string } | undefined) => s?.listing === 'wrapper' || s?.listing === 'subsidized';
  const minN = categories.language_cells?.min_n ?? categories.min_n;
  const allLangs = categories.languages.filter((l) => l.key !== 'en').sort((x, y) => y.n - x.n);
  const en = categories.languages.find((l) => l.key === 'en');
  // CR-290 (Florian 5 Oct 2026): a language column in which no system reaches the reporting minimum was all dashes.
  // Those columns are not drawn; their languages and item counts are listed in the caption instead. Display only.
  const shown = (l: { key: string }) => systems.some((s) => (categories.systems[s.key]?.languages?.[l.key]?.n ?? 0) >= minN);
  const langs = allLangs.filter(shown);
  const hidden = allLangs.filter((l) => !shown(l));
  // Florian 10 Oct 2026: the mixed-language group is the first column, then English, then the single languages by item count.
  const mixed = langs.find((l) => l.key === 'mixed');
  const columns = [...(mixed ? [mixed] : []), ...(en ? [en] : []), ...langs.filter((l) => l.key !== 'mixed')];
  return <section className="mt-10" aria-labelledby="jev16-languages" data-bh-jev16-language-view>
    <h2 id="jev16-languages" className="text-2xl font-bold">Languages</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">Raw chance-corrected competence per item language (0 = chance, 100 = perfect; can be negative), from each system&apos;s own measured items:
      {' '}{categories.language_cells ? languagePoolNote(categories.language_cells) : `Self-hosted rows use S ${a.v16.counts.S} + P ${a.v16.counts.P}; API rows use their measured sealed subset plus P. Sage (A3) language cells and A2/A3 topic/use-case cells cover public P300 only. Raw and outside the Composite.`} Cells under {minN} completed supported responses are left empty; recorded input refusals count toward coverage. A dagger (†) marks fewer than 30 completed responses. Competence retains all supported scored observations, including failures and refusals.
      {!categories.language_cells && !categories.supplement && ` Per-language coverage grows with the expanded uc1.1 multilingual pool, a candidate for a later release that is not part of ${a.revision}.`}
      {en ? `${mixed ? ' The mixed-language group is listed first, then' : ''} English (${en.n.toLocaleString('en-US')} items)${mixed ? '' : ' is listed first'}; the other ${allLangs.filter((l) => l.key !== 'mixed').length} languages${allLangs.some((l) => l.key === 'mixed') ? ' and the mixed-language group' : ''} share ${allLangs.reduce((s, l) => s + l.n, 0)} items.` : ''}
      {hidden.length > 0 && <span data-bh-jev16-language-hidden={hidden.map((l) => l.key).join(' ')}>{' '}In {hidden.length === 1 ? 'one further group' : `${hidden.length} further groups`} no system reaches the {minN}-item reporting minimum, so {hidden.length === 1 ? 'it gets' : 'they get'} no column (items in the pool shown): {hidden.map((l) => `${l.label} (${l.n})`).join(', ')} — {hidden.reduce((s, l) => s + l.n, 0)} items, scored like every other item.</span>}
    </p>
    <div className="mt-3 overflow-x-auto"><table className="text-left text-xs tabular" data-bh-jev16-language-table>
      <caption className="sr-only">JevBench {a.revision} competence by item language and system</caption>
      <thead><tr><th scope="col" className="sticky left-0 z-10 bg-[rgb(var(--panel))] p-1.5" title="System and measured item pools. Hover any row header or cell for its full coverage remarks.">System</th>
        {columns.map((l) => <th key={l.key} scope="col" className="whitespace-nowrap p-1.5 text-center" title={`${l.label}: ${l.n} items (${l.open} public, ${l.sealed} sealed)`}>{l.key}{l.n < 30 && <sup aria-label="low n">†</sup>}<span className="bh-muted block font-normal">{l.n}</span></th>)}</tr></thead>
      <tbody>{systems.map((s, i) => {
        const remarks = [
          categories.supplement && spokeReason(s.key),
          'language_listing_note' in s && s.language_listing_note,
          exposureNote(s.key),
          languageNoteOf(categories, s.key),
        ].filter(Boolean).join('\n');
        const rowTitle = `${s.display} · ${laneTag(s)}\nMeasured item pools: ${coverageOf(categories, s.key)}${remarks ? `\n${remarks}` : ''}`;
        return <Fragment key={s.key}>
        {(['v1.6.3', 'v1.6.4'].includes(a.revision) ? belowRanking(s) && !belowRanking(systems[i - 1]) : (s.listing as string) === 'wrapper' && (systems[i - 1]?.listing as string) !== 'wrapper') && <tr {...apiRowProps(s.key, hiddenApi)}><th colSpan={1 + (en ? 1 : 0) + langs.length} className="p-2 pt-4" scope="colgroup" title="These systems are listed separately and never ranked.">{['v1.6.3', 'v1.6.4'].includes(a.revision) ? 'Wrappers and subsidized systems (listed, never ranked)' : 'Wrappers (listed, never ranked)'}</th></tr>}
        <tr data-bh-jev16-language-row={s.key} className="border-t border-line" {...apiRowProps(s.key, hiddenApi)}>
        <th scope="row" className="sticky left-0 z-10 bg-[rgb(var(--panel))] p-1.5 font-normal" title={rowTitle}>
          <span className="block w-56 truncate">{nameLabel(s.display, systems)}</span>
          <span className="bh-muted block w-56 truncate">{laneTag(s)} · <span data-bh-jev16-cell-coverage={coverageOf(categories, s.key)}>{coverageOf(categories, s.key)}</span>{remarks && <span aria-hidden="true"> · ⓘ</span>}</span>
          {categories.supplement && spokeReason(s.key) && <span className="sr-only" data-bh-radar-spoke-exception={s.key}>{spokeReason(s.key)}</span>}
          {'language_listing_note' in s && s.language_listing_note && <span className="sr-only" data-bh-language-listing={s.key}>{s.language_listing_note}</span>}
          {exposureNote(s.key) && <span className="sr-only" data-bh-l3-exposure-note={s.key}>{exposureNote(s.key)}</span>}
          {languageNoteOf(categories, s.key) && <span className="sr-only" data-bh-language-coverage-note={s.key}>{languageNoteOf(categories, s.key)}</span>}
        </th>
        {columns.map((l) => {
          const c = categories.systems[s.key]?.languages?.[l.key];
          if (!c || completedLanguageN(c) < minN) {
            const status = c ? `${completedLanguageN(c)} completed responses; below the ${minN}-item reporting minimum` : `Not plotted; fewer than ${minN} answered items`;
            return <td key={l.key} className="p-1.5 text-center bh-muted" title={`${l.label}: ${status}\n${rowTitle}`} aria-label={`${l.label}: ${status}\n${rowTitle}`} data-bh-jev16-language-suppressed>{!c ? '—' : '·'}</td>;
          }
          const lowN = completedLanguageN(c) < 30;
          return <td key={l.key} className="bh-heat p-1.5 text-center" style={heat(c.competence)} data-bh-heat-low-n={lowN ? '' : undefined} title={`${l.label}: ${c.competence.toFixed(1)} over ${c.n} scored observations; ${completedLanguageN(c)} completed responses${lowN ? ' (low n)' : ''}\n${rowTitle}`}>{c.competence.toFixed(0)}{lowN && <sup className="ml-0.5 text-[10px]" aria-label="low n: fewer than 30 answered items">†</sup>}</td>;
        })}
      </tr></Fragment>; })}</tbody>
    </table></div>
  </section>;
}

function DatedCarry({ carry, hiddenApi, showExceptions }: { carry: JevV16Carry; hiddenApi: ReadonlySet<string>; showExceptions: boolean }) {
  // Review 6 Oct 2026: the date counts follow the default view (hidden API rows are counted separately, and badged when shown).
  const byRelease = carry.releases.map((r) => ({ ...r, n: carry.rows.filter((row) => row.measured_revision === r.revision && !hiddenApi.has(row.key)).length })).filter((r) => r.n > 0);
  const shownByDefault = carry.rows.filter((r) => !hiddenApi.has(r.key)).length;
  return <section className="bh-panel mt-10 p-5" aria-labelledby="jev16-carry" data-bh-jev16-dated-carry>
    <h2 id="jev16-carry" className="text-2xl font-bold">Not yet measured on v1.6 · {shownByDefault < carry.rows.length ? `${shownByDefault} open-weights systems` : `${carry.rows.length} systems`} with a dated carried score</h2>
    {shownByDefault < carry.rows.length && <p className="bh-muted mt-1 text-xs">A further {carry.rows.length - shownByDefault} carried rows are hosted API offerings; they appear here when “Show API offerings” is on and are listed on the <a className="text-accent underline" href="/jev-models/api#jev16-carry">API leaderboard</a>.</p>}
    <p className="bh-muted mt-1 max-w-4xl text-sm">{carry.rule} {carry.method}</p>
    <p className="bh-muted mt-1 text-xs">Dates: {byRelease.map((r) => `${r.revision} published ${r.published_on} (${r.n})`).join(' · ')}{shownByDefault < carry.rows.length ? ` · plus ${carry.rows.length - shownByDefault} hosted API rows when shown` : ''}. The date is the publication day of the release that first published the measurement, not a per-model measurement timestamp.</p>
    <div className="mt-3 max-h-[40rem] overflow-auto"><table className="w-full text-left text-sm tabular">
      <caption className="sr-only">Carried JevBench v1.5.x results, not ranked with v1.6 measurements</caption>
      <thead><tr>{['System', 'Measured on', 'Capability (v1.5 scale)', 'v1.5 Composite', 'Cost / 1,000', 'Median latency'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{carry.rows.map((r) => <tr key={r.key} className="border-t border-line" data-bh-jev16-carry-row={r.key} {...apiRowProps(r.key, hiddenApi)}>
        <th scope="row" className="p-2 font-normal"><a className="text-accent underline" href={r.source_url ?? r.repo ?? undefined}>{r.display}</a>{hiddenApi.has(r.key) && <span className="bh-thin-tag bh-flag-tag ml-1">API</span>}{showExceptions && spokeReason(r.key) && <span className="bh-muted block text-xs" data-bh-radar-spoke-exception={r.key}>{spokeReason(r.key)}</span>}{r.note && <span className="bh-muted block text-xs">{r.note}</span>}</th>
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
  { version: 'v1.7.37', date: '2026-10-10', text: 'Three more historical rows now have language and category cells on the current pools: Von, GLiNER2 and GLiNER2.5 multi. They keep their published v1.5 headlines; the cells come from new runs with the original pinned model and setup on isolated machines. Von and GLiNER2.5 multi reach at least 61 completed responses in every language, 100 in every subject topic and 80 in every use case. GLiNER2 fills both radars (at least 57 per topic, 45 per use case) and every language column, but about 1,000 of its issued items were lost to out-of-memory kills and a machine shutdown; they stay counted as spent, so 22 languages rest on 42 to 59 answered items, below the 60-item target. Rows that still cannot be measured now give the concrete reason: Aplomb 1 (pinned revision deleted upstream), ClassOne Gemma 4 E2B (re-run did not reproduce its original answers) and swanOne (weights return HTTP 401). L3 items were reviewed by an OpenAI model, so cells based on L3 carry that exposure; headline scores do not use L3. Headline scores, Capability, Composite, ranks and pricing are unchanged.' },
  { version: 'v1.7.36', date: '2026-10-10', text: 'Nine more rows now cover S+P+L1+L2+L3 in the language table and both radars: Diffusion Jev, SPX-CD-Omni, Seb-9B, APUS-OpenJev-v1-9B, APUS-OpenJev-v1-35B-A3B, Jobe Qwen3.5-4B, AutoJev-27B (RTX PRO 6000), NInfer Qwen3.8-27B NVFP4 (T=1.5) and OpenJev (DiffusionGemma 26B-A4B NVFP4, razorback16). The last four are historical rows: they keep their published v1.5 headlines, and their language and category cells come from a new run on the current pools with the original pinned model and serving setup. Diffusion Jev, SPX-CD-Omni, Seb-9B and both APUS rows match their original public answers on at least 97 %. The razorback16 OpenJev model samples stochastically, so its repeated passes agree on 86 to 89 % of the public items; its note says so. Every row has at least 65 completed responses in every language, 109 in every subject topic and 83 in every use case. L3 items were reviewed by an OpenAI model, so cells based on L3 carry that exposure; headline scores do not use L3. Headline scores, Capability, Composite, ranks and pricing are unchanged.' },
  { version: 'v1.7.35', date: '2026-10-10', text: 'Seven more rows now cover S+P+L1+L2+L3 in the language table and both radars: René-1 31B FP8, decisio v0.8.0 on gemma-4-12B-it, Hopper 12B trained, decider-12b v2, decider-12b v1, Bobcat Flash 1.2 and Mica v0.1 4B. Each answered all 1,505 supplemental items with its original pinned model and serving setup on an isolated machine; answers to the 300 public items match the original runs (at least 99 %). Mica keeps its published v1.5 headline; its language and category cells come from a new run on the current pools. Every row has at least 65 completed responses in every language, 109 in every subject topic and 83 in every use case. The language table now lists the mixed-language group first. L3 items were reviewed by an OpenAI model, so cells based on L3 carry that exposure; headline scores do not use L3. Headline scores, Capability, Composite, ranks and pricing are unchanged.' },
  { version: 'v1.7.34', date: '2026-10-10', text: 'Seven more self-hosted rows now cover S+P+L1+L2+L3 in the language table and both radars: TypeCastLM 1.4.0, CoCo-Decision-4B, ClassOne Qwen 3.5 9B, EXAONE-4.0-1.2B-JEV v0.3, jul fast, WaterSheep and Tacet Sonata. Each answered all 1,505 supplemental items with its original pinned model and serving setup on an isolated machine; their answers to the 300 public items match the original runs (at least 97 %). Every row has at least 65 completed responses in every language, 109 in every subject topic and 83 in every use case. Long-input refusals stay scored as before. L3 items were reviewed by an OpenAI model, so cells based on L3 carry that exposure; headline scores do not use L3. Headline scores, Capability, Composite, ranks and pricing are unchanged.' },
  { version: 'v1.7.33', date: '2026-10-10', text: 'Messier One v0.2 now covers S+P+L1+L2+L3, with all 1,505 supplemental items answered natively on the original image with the network disabled: at least 65 completed responses in every language, 109 in every subject topic and 83 in every use case. The original P300 answers recur in each supplement and count once; the original S+P measurement had no HTTP errors. L3 items were reviewed by an OpenAI model, so cells based on L3 carry that exposure; headline scores do not use L3. Headline scores, Capability, Composite, ranks and original row pricing are unchanged.' },
  { version: 'v1.7.31', date: '2026-10-10', text: 'Microsoft-Decision-1 joins the hosted API board after a native Azure Foundry measurement on 1,200 sealed plus 300 public observations: Capability 70.78, Calibration 84.40 and Composite A 69.11. Its 21 context-limit failures remain in the scored denominator. Native median latency is 459 ms on the 124-request speed subset. This new full-set O1S run uses its completed-field median gap reference of 7.088 score points; historical rows retain their own dates, pools and references rather than being remeasured or converted. The existing top five on Composite A and capped Capability are unchanged. All 50 topic/use-case/language cells are recorded; thin cells stay suppressed or table-only, and qualified supplemental coverage remains pending.' },
  { version: 'v1.7.30', date: '2026-10-10', text: 'decisio v0.8.0 on gemma-4-31B-it now covers S+P+L1+L2+L3, with all 1,505 supplemental items answered natively: at least 65 completed responses in every language, 109 in every subject topic and 83 in every use case. The original P300 answers recur in each supplement and count once. The original 23 HTTP 500 errors remain operational non-answers and are not imputed. L3 items were reviewed by an OpenAI model, so its cells based on L3 carry that exposure; this row is the original locally served Gemma offering. Headline scores, Composite, ranks and original row pricing are unchanged.' },
  { version: 'v1.7.29', date: '2026-10-09', text: 'Mercury Decide now has at least 64 completed observations in every language, 109 in every subject topic and 83 in every use case, using S+P+L1+L2+L3. L3 retains 1,416 records on its full 1,418-item denominator, including original refusals and operational failures; two spent failures remain missing. Paid supplemental decisions use the currently declared Inception 2026-09-30 offering and the original native protocol. Public top labels agree on 96.63%, with differing probabilities and unproven historical weights/calibrator equality; the row coverage note gives the comparison. Headline scores, Composite, ranks and original row pricing are unchanged.' },
  { version: 'v1.7.28', date: '2026-10-09', text: 'GLiNER 2.5 Small now covers P300 + L1 + L2 + L3 with 1,802 completed native responses: at least 60 in each of 23 languages, 78 in every subject topic and 52 in every use case. Its original offline CPU/fp32 profile is unchanged. Three earlier public-item OOM outcomes remain missing and contribute no completed coverage; no requests were replayed. These cells exclude historical S answers and stay outside headline scores. Headline scores, Capability, Composite and every rank are unchanged.' },
  { version: 'v1.7.27', date: '2026-10-09', text: 'OpenJev DeBERTa v3 Large adds 60 new L5 items: 20 each in Arabic, Hindi and Greek. It now has at least 63 completed responses in every language (Arabic 70, Hindi 73, Greek 69). The original native context was checked before keeper selection; all 60 requests succeeded, and earlier failures remain scored. Other rows and category views retain their existing measurements. Headline scores, Capability, Composite and every rank are unchanged.' },
  { version: 'v1.7.26', date: '2026-10-08', text: 'BB-Qwen3.5-4B-LoRA now covers S+P+L1+L2+L3, with at least 65 completed responses in each of 23 languages and at least 83 on every capability and use-case spoke. Two DNS failures remain scored and do not count toward completed coverage. Its reference cost stays unknown; these view values do not impute a price. OpenJev DeBERTa v3 Large now includes its completed L1/L2 runs; Arabic (50), Hindi (53) and Greek (49) still need more completed responses. Headline scores, Capability, Composite and every rank are unchanged.' },
  { version: 'v1.7.25', date: '2026-10-08', text: 'Watt Flash 0.1 and OpenJev Verdict completed their language supplements. Both now cover S+P+L1+L2+L3, with at least 65 completed responses in each of 23 languages and at least 83 in each capability and use-case category. Other rows retain their existing measurements, including Fastino’s Hindi L4 supplement. Headline scores, Capability, Composite and every rank are unchanged.' },
  { version: 'v1.7.24', date: '2026-10-08', text: 'Fastino GLiNER 2.5 Decide now has 69 completed Hindi responses after a new 20-item Hindi supplement. Seventeen requests succeeded; three HTTP 400 failures remain scored and do not count toward completed coverage. L4 is used only for this offering’s Hindi language cell, with OpenAI author and independent Anthropic reviewer provenance disclosed. The mghafiri Qwen3.5 0.8B row also completed L3, expanding its language and category cells. Headline scores, Capability, Composite and every rank are unchanged.' },
  { version: 'v1.7.23', date: '2026-10-08', text: 'The Languages table includes every listed model, including historical and catalogue entries. These rows use their stored language measurements where available and show pending cells where measurements are unfinished. Historical headline scores are not used as language values. Headline scores, Capability, Composite and every rank are unchanged.' },
  { version: 'v1.7.22', date: '2026-10-08', text: `Languages and radars now include completed L1/L2/L3 runs for SPX CD Flash, SPX CD Pro and Decisio Gemma 4 12B v0.9. Coverage counts completed supported responses and recorded input refusals; authentication, rate-limit, service and transport errors do not satisfy reporting thresholds. Competence keeps its original scored observations. ${spokeExceptions.length} listed rows still have incomplete radar coverage and show the reason. Every listed row remains in the completion check. Headline scores, Capability, Composite and every rank are unchanged.` },
  { version: 'v1.7.21', date: '2026-10-08', text: `Languages and radars: more rows completed their L1/L2/L3 supplement runs, among them Instinct (its API is back), Surogate Rune 26B-A4B v3, Xor 26B-A4B, JADE, Jebadiah 27B, Kev 27B, Decision 2.0 Vega 27B and the self-hosted SimpleJev Qwen3.8-27B. ${spokeExceptions.length} rows still show a reason instead of a full radar: newly listed rows whose supplement runs are not done yet, rows not measured on this item pool, and one model whose pinned weights could not be accessed. Headline scores, Capability, Composite and every rank are unchanged.` },
  { version: 'v1.7.20', date: '2026-10-08', text: `Correction and progress for the language and radar views. The self-hosted row SimpleJev Qwen3.8-27B wrongly counted the hosted SimpleJev API row's L1/L2/L3 supplement answers in its language and category cells (v1.7.18 and v1.7.19), because both share a file name. Its cells now use only its own S + P answers until its own supplement runs finish, and the cell builder no longer lets a hosted-API run count for a self-hosted row. More open-weights rows completed their L1/L2/L3 runs. ${spokeExceptions.length} rows still show a reason instead of a full radar. Headline scores, Capability, Composite and every rank are unchanged.` },
  { version: 'v1.7.19', date: '2026-10-08', text: `Languages and radars: the open-weights rows were run on the L3 supplement overnight, and most rows that still lacked the earlier L1/L2 supplements got them too. Their language cells and topic/use-case radars now count every item they answered (S + P + L1 + L2 + L3), and Qwen3.8 27B (Chutes) finished its L3 run. L3 items were reviewed by an OpenAI model, so the L3-based language and category cells of OpenAI rows carry that exposure; a note next to those rows says so, and headline scores do not use L3. ${spokeExceptions.length} rows still show a reason instead of a full radar, for example runs still in progress, a provider that is down, withdrawn weights or rows not measured on this pool. Headline scores, Capability, Composite and every rank are unchanged.` },
  { version: 'v1.7.18', date: '2026-10-08', text: `Languages and radars for every row. A new sealed supplement, L3 (1,118 items drawn on 7 Oct 2026: items written natively in 21 languages plus a mixed-language group, and English items for thin radar categories such as everyday language, safety and the "other" use case), gives every language at least 60 items on P ∪ L1 ∪ L2 ∪ L3 (before: as few as 4). The hosted API rows answered it: their language cells and their use-case and topic radars now rest on about 2,100 answered items (3,000 for rows that answered the full sealed set), with at least 69 on every spoke. Open-weights rows are being run on it in the current GPU wave and update as they finish. ${spokeExceptions.length} rows that do not reach 30 items on every spoke yet show the reason next to the row. Headline scores, Capability, Composite and every rank are unchanged.` },
  { version: 'v1.7.17', date: '2026-10-07', text: `Languages now includes every measured row on both boards, with wrappers listed below the models. ${languagePoolNote(JEVBENCH_LANGUAGE_META)} ${Object.values(apiRerunCells.systems as Record<string, { coverage: string; category_pools?: string }>).filter((r) => /^(A4|A5)\+P/.test(r.coverage) && r.category_pools?.includes("L1+L2")).length} API rows re-run on A4/A5 have answered L1/L2 supplements; their category radars count those items too. L3 coverage will follow when measured.` },
  { version: 'v1.7.16', date: '2026-10-07', text: 'Compare view, API board: subject-topic and use-case radars for OpenAI Decisions, the 17 API offerings re-run on A4 ∪ P and the classifier.dev wrapper. Their 600 new sealed items were labelled with the same recipe as every other item (Winnow-12B Q8 on our own GPU pod; uc1 items keep their authoring use case); values are raw and rest on 600 items (300 sealed), so more categories fall under the 30-item spoke minimum and are listed below the radar. Each of these rows also gets a breakdown section on its own page. Every live row now has all breakdown views, and a release check keeps it that way. No score, axis, cost or rank changed.' },
  { version: 'v1.7.15', date: '2026-10-07', text: 'Compare view, API board: OpenAI Decisions, the 17 API offerings re-run on A4 ∪ P and the classifier.dev wrapper now show competence per request type and per tier on the open and sealed items they answered (300 open + 300 sealed: fewer sealed items than the full set, so wider uncertainty; the view note says so), and Liquid AI d1 shows its subject-topic and use-case radars. Values are raw, computed from the stored per-item results with the same scorer as every other row. Subject-topic and use-case radars for the 600-item rows follow once their 600 new sealed items are labelled. No score, axis, cost or rank changed.' },
  { version: 'v1.7.14', date: '2026-10-07', text: 'Open-weights board: H2O-Lightning-4B v1.1 (H2O.ai) and Kahn1 4B (Okura66), two Qwen3.5-4B fine-tunes submitted as JevBench add-requests, measured on the same sealed v1.6 pool with the same scorer, G_med and cost basis as every other row (addendum a8 of v1.6.1). Both are priced with labelled cost estimates like every other Qwen3.5-4B row; Kahn1\'s server reports no token usage, so its estimate is our own count of its input tokens (three passes per decision, its server default). Both rank inside the Jev-class caps: H2O-Lightning-4B at #3 of the Capability Score and #1 of the Composite, Kahn1 at #23 of the Capability Score. No published score, axis or cost changed.' },
  { version: 'v1.7.13', date: '2026-10-07', text: 'Open-weights board: Surogate Rune 26B-A4B v3 (measured on the v1.6 pool for the first time; its dated v1.5 row stays in the carried list) and Xor 26B-A4B (Juspay), both from the top 20 of the community Jev Decision Index on Hugging Face, measured on the same sealed v1.6 pool with the same scorer, G_med and cost basis as every other row (addendum a7 of v1.6.1). Both rank inside the Jev-class caps, at #3 and #4 of the Capability Score. No published score, axis or cost changed.' },
  { version: 'v1.7.12', date: '2026-10-07', text: 'Languages and use cases: the per-language and per-use-case cells now also count two sealed supplements, a language supplement L1 (354 items) and a use-case supplement L2 (33 items), drawn and reviewed on 6 Oct 2026. Every one of the 22 languages (plus the mixed-language group) and every one of the 20 use cases now has at least 30 items (before: as few as 5). 82 rows answered both supplements; rows not run on them yet keep their S + P cells and are tagged S+P (or S+P+L1). Headline scores, Capability, Composite and every rank are unchanged on both boards.' },
  { version: 'v1.7.11', date: '2026-10-07', text: 'Open-weights board: 12 new self-hosted Jev-compatible rows from the top 20 of the community Jev Decision Index on Hugging Face (Perplexity Decider v1.1 27B, torchcast-decision-27b, Kev 27B, decider chat on Gemma-4-31B-it, GEV-26B-Decide, Decision 2.0 Vega 27B, JEV-27B, Jebadiah 27B, JADE, Bespoke Nimble 9B v3, SimpleJev Qwen3.8-27B self-hosted, JPT-35B-A3B), measured on the same sealed v1.6 pool with the same scorer, G_med and cost basis as every other row (addendum a6 of v1.6.1). No published score, axis or cost changed; ranks move only where a new row places above. Rows priced above the Jev-class cost or latency caps are listed under the limits section, not in the Capability ranking.' },
  { version: 'v1.7.10', date: '2026-10-06', text: 'API board: OpenAI Decisions (POST /v1/decisions with gpt-6-luna) replaces its preliminary public-set row with its official result. It answered a fresh sealed API set A5 (300 never-used sealed items, since A4 had already been sent to OpenAI) plus the 300 public items (598 of 600 answered) and is equated to the v1.6.1 scale with the same method and pool as the A4 rows (offsets +5.78 Intelligence, +6.15 Calibration). It is ranked on the API board: Composite 62.5 (95% interval 51.6–64.6), Capability 73.5; list price USD 0.10 per 1M input tokens as of 6 Oct 2026 (launch day), re-checked at each revision. It enters the API Composite top 5 at #5, statistically tied with Instinct (62.2, now #6), and the Jev-class Capability top 5 at #4 (Instinct moves to #5, Vansa-3.4 to #6). Every other score is unchanged; the open-weights board is unchanged.' },
  { version: 'v1.7.9', date: '2026-10-06', text: 'API board: the OpenAI Decisions API (POST /v1/decisions with gpt-6-luna, opened on 6 Oct 2026) is added as a preliminary, unranked row from the 300 public v1.6 items (298 answered; Capability 68.8, Composite 37.2 on that set; list price USD 0.10 per 1M input tokens). Its official sealed run waits for the next fresh sealed API draw. No score or rank changed on either board.' },
  { version: 'v1.7.8', date: '2026-10-06', text: 'API board: Liquid AI d1 is added as a ranked API offering. It answered the full v1.6.1 set (1,200 sealed + 300 public items, all 1,500 answered) on 6 Oct 2026 and is scored exactly like the other full-set API rows, without equating (Composite 73.0, Capability 74.4; tariff USD 0.04 per 1M input tokens). It enters the API board top 5 in Composite and in Jev-class Capability. Every other score is unchanged; the open-weights board is unchanged.' },
  { version: 'v1.7.7', date: '2026-10-06', text: 'API board: 17 API offerings re-measured in full on a fresh sealed API set (A4, 300 never-used sealed items plus the 300 public items, 6 Oct 2026) and equated to the v1.6.1 scale with the published A2/A3 supplement method. They replace the hatched preliminary rows and are ranked on the API board: Instinct and Vansa-3.4 enter its Composite top 5, and Instinct, Vansa-3.4 and Instinct Dual 4B join Sage and Jev in its Jev-class Capability top 5; GPT-6 Luna, Qwen3.8 27B, GPT-6 Luna low, DeepSeek Flash and GPT-5.6 Luna have the highest raw Capability (98.4, 98.2, 97.8, 97.4 and 94.5) but sit outside the Jev-class caps. Qwen3.8 27B (Chutes) is ranked as well (Composite 0.0: no published tariff, so its documented USD 2.18 estimate per 1,000 decisions gives Cost 0). Instinct and Instinct Dual 4B are now treated as production APIs (public tariff), so no demo-endpoint latency adjustment applies to them. classifier.dev (fast tier) is listed as a wrapper, not ranked. No preliminary rows remain. The open-weights board is unchanged.' },
  { version: 'v1.7.6', date: '2026-10-06', text: 'API board: Vansa-3.4 and Instinct Dual 4B now have v1.6 public-set figures and appear as preliminary rows; Autoloops stays pending while its full run on the fresh sealed set is in progress. Very long items that exceed a provider’s context window count as wrong without ending the run. No rank changed.' },
  { version: 'v1.7.5', date: '2026-10-06', text: 'API board: every API offering with a v1.6 public-set figure is drawn in the Composite and Capability charts as a hatched, unranked “preliminary” row at its score position (public set of 300 items; full sealed re-evaluation running); offerings without any v1.6 figure are greyed “pending” rows. Adds Qwen3.8 27B (Chutes) and Fastino GLiDE to the public-set table. The four ranked rows and every rank are unchanged; the open-weights board is unchanged.' },
  { version: 'v1.7.4', date: '2026-10-06', text: 'API board: every reachable API offering that was not yet re-measured on v1.6 now has a dated public-set figure (the 300 public v1.6 items, no sealed items), shown next to its older v1.5 score with Jev and other ranked APIs on the same 300 items as anchors. Not ranked and not comparable with the 1,500-item headline; no score or rank of either board changed.' },
  { version: 'v1.7.3', date: '2026-10-06', text: 'Display only, no score or rank changed. The API board ranks every offering at its own list price and no longer shows a base-model reference price (that comparison only matters against open weights). The Jev reference row and, with “Show API offerings” on, every API offering now sit at their score position in each ranking section (Composite and Capability) instead of the folded end of the list.' },
  { version: 'v1.7.2', date: '2026-10-06', text: 'Display only. The API roster says why carried API rows were not re-run on v1.6 yet (exposure cadence, retired v1.6.0 sealed set) and that no v1.5 to v1.6 conversion is applied.' },
  { version: 'v1.7.1', date: '2026-10-06', text: 'Display only, no score or rank changed. Headings name the board (open weights / API offerings); the API board leads with the Composite Score and lists every API offering we measured, including mode variants, carried v1.5.x rows and wrappers; the Jev reference row reads “Not ranked, only shown as a reference to compare with” on the open-weights board; long base-model notes became numbered footnotes under the ranking; a short expandable note explains the split.' },
  { version: 'v1.7.0', date: '2026-10-06', text: 'Leaderboard split. /jev-models ranks open-weights systems we ran on our own hardware, with Jev 1.13.0 as an unranked reference row and a “Show API offerings” switch; hosted API offerings are ranked on the new /jev-models/api board. No score was recomputed: ranks are the published order filtered to each board. Adds the GPU cost What-If.' },
  { version: 'v1.6.0', date: '2026-10-05', text: 'Rotating sealed item sets, API-exposure rule, Noul decisiveness (method B), language view and dated carry.' },
];

function BoardSplit({ scope, history, preliminary }: { scope: JevScope; history: Array<{ revision: string; date: string; summary: string }>; preliminary: boolean }) {
  const boardOnly = JEV_BOARD_REVISIONS.filter((r) => r.version.startsWith('v1.7'));
  const revisions = history.length > 0 ? [...boardOnly, ...history.map((r) => ({ version: r.revision, date: r.date, text: r.summary }))] : JEV_BOARD_REVISIONS;
  return <div data-bh-jev-board-split>
    <h3 className="mt-4 text-lg font-semibold">Open weights and API offerings (board {JEV_BOARD_REVISIONS[0].version})</h3>
    <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">
      <li>{scope === 'open' ? 'This board' : 'The main board at /jev-models'} ranks <b>open-weights systems</b>: published weights that we ran ourselves, on GPU or CPU machines we rent and operate. A system we measured through an endpoint we do not run (vendor API, author-hosted or third-party-hosted endpoint, for example Qwen3.8 27B via Chutes) is an <b>API offering</b>, even when its base weights are open; API offerings are ranked on {scope === 'api' ? 'this board' : <a className="text-accent underline" href="/jev-models/api">the API leaderboard</a>}.</li>
      <li>Why separate boards: open weights can be compared on equal hosting terms, while an API price is a vendor decision that can be subsidised or raised later and is not reproducible by readers. Every score and measurement is the same on both boards; only the set of ranked rows differs, and ranks are the published order filtered to that set.</li>
      <li>Jev 1.13.0 is a hosted API. It stays on the open-weights board as the <b>reference row</b> (it defines the Jev-class cost and latency caps) and is not ranked there; it is ranked on the API leaderboard.</li>
      <li>Official cost basis is unchanged: the Cost axis keeps each row&apos;s documented reference price (see the cost notes below; APIs with a known base model are priced at the developer&apos;s own list price). The base-model reference price only applies to open-weights rows; API offerings are ranked at their own list price{scope === 'api' ? ' on this board' : ''}. {scope === 'open' ? 'The GPU cost calculator above' : 'The GPU cost calculator on the main board'} is a What-If for your own hosting and never changes a score or rank.</li>
      <li><b>Full API re-run (A4, v1.7.7).</b> {scope === 'api' ? 'Most offerings on this board' : 'Most API offerings'} were measured on 6 Oct 2026 on a fresh sealed API set A4 (300 never-used sealed items) plus the same 300 public items every system answers, and equated to the v1.6.1 S ∪ P scale with the published A2/A3 supplement method (offset {(apiA4 as { a4_offsets: { I: number; C: number } }).a4_offsets.I >= 0 ? '+' : ''}{(apiA4 as { a4_offsets: { I: number; C: number } }).a4_offsets.I.toFixed(2)} Intelligence, +{(apiA4 as { a4_offsets: { I: number; C: number } }).a4_offsets.C.toFixed(2)} Calibration; pool of {(apiA4 as { a4_pool: string[] }).a4_pool.length} ranked self-hosted systems re-run on A4 ∪ P). Jev, Sage, wity-1 and Fastino GLiNER-2.5-Decide keep their full-set S ∪ P scores; Liquid AI d1 answered the full S ∪ P set on 6 Oct 2026 (v1.7.8) and is scored like them, without equating. The pool is mid-strength, so for the strongest LLM rows the offset is an extrapolation (likely within ±2 Intelligence points; the 95% intervals include it). Nine A4 ∪ P items of about 77,000–82,000 input tokens, beyond the Jev reference&apos;s accepted input range, count against Intelligence when refused but are left out of cost. Rows without a public tariff keep their documented v1.5 cost estimate. A4 is now retired for everyone.{A5_TEXT}</li>
      <li data-bh-jev-cells-supplement><b>Language and use-case cells (v1.7.12).</b> These breakdowns add two sealed supplements (354 language items, 33 use-case items, drawn and reviewed on 6 Oct 2026), so every language and use case has at least 30 items. Headline scores are unchanged; rows not yet run on the supplements are tagged S+P in the language table.</li>
      {preliminary ? <li>API offerings that are not yet re-measured on the full v1.6 set show a dated <b>public-set figure</b> (the 300 public v1.6 items, no sealed items, so no exposure) next to their older v1.5 score. It is never ranked; on the API board it is drawn as a hatched “preliminary” bar so every offering is visible, but strictly it is comparable only with the anchor rows scored on the same 300 items (Calibration on 300 items reads a few points lower than on 1,500){scope === 'api' ? <> (<a className="text-accent underline" href="#jev-api-public-set">table</a>)</> : ''}.</li> : <li>Every API offering we reached is measured on v1.6.1: either on the full 1,500-item set or on A4 ∪ P (600 items, equated). No preliminary public-set rows remain.</li>}
    </ul>
    <h3 className="mt-4 text-lg font-semibold">Revision history</h3>
    <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm" data-bh-jev-revision-history>
      {revisions.map((r) => <li key={r.version}><b>{r.version}</b> ({r.date}): {r.text}</li>)}
      <li>Earlier releases: <a className="text-accent underline" href="/jev-models/v1.5.7">v1.5.7</a>, <a className="text-accent underline" href="/jev-models/v1.5.6">v1.5.6</a>, <a className="text-accent underline" href="/jev-models/v1.5.5">v1.5.5</a> and the historical boards below.</li>
    </ul>
  </div>;
}

function Method(props: Parameters<typeof MethodBody>[0]) {
  return <section className="mt-10 max-w-4xl" aria-labelledby="jev16-method-title" id="jev16-method" data-bh-jev16-method>
    <h2 id="jev16-method-title" className="text-2xl font-bold">{isFreshJevbenchV16Revision(props.a.revision) ? `Method notes · fresh native cohort${props.a.revision === 'v1.6.2' ? '' : ` · ${props.a.revision}`}` : `Method · ${props.a.revision}`}</h2>
    <MethodBody {...props} />
  </section>;
}

function MethodBody({ categories, a, sha256, categoriesSha256, carrySha256, scope, hiddenApi, preliminary }: { categories: JevV16Categories; a: JevV16ReleaseArtifact; sha256: string; categoriesSha256: string; carrySha256: string; scope: JevScope; hiddenApi: ReadonlySet<string>; preliminary: boolean }) {
  if (isFreshJevbenchV16Revision(a.revision)) return <>
    <p className="mt-2">Each system answered the same 1,200 freshly drawn sealed decisions and 300 public decisions on an offline GPU pod. Scores use methodology v1.6, O1S, with 1,000 bootstrap samples and seed 16.</p>
    <p className="mt-2">Capability is the mean of Intelligence and Calibration within the frozen Jev-class cost and median-latency caps. Composite is secondary. Failed and refused answers remain in the full 1,500-decision denominator.</p>
    <p className="mt-2">The public-versus-sealed gap reference is the median of this completed native cohort: {one(a.G_med)} points. Historical scores are shown separately with their original dates and do not enter this cohort’s median or ranking. No API equating is applied.</p>
    {a.revision === 'v1.6.4' && <p className="mt-2">This same-draw six-model addendum adds the measured RYOTIDE wrapper to v1.6.3. The five prior measurements, point scores and four-native field median are retained. The standard scorer recalculates confidence intervals for the expanded roster. Wrappers remain listed below ranking and excluded from the median.</p>}
    {a.revision === 'v1.6.3' && <p className="mt-2">This same-draw addendum rescores the whole completed field, including the original four systems, together. The original measurements are retained, but the v1.6.3 scores, ranks and native-field median restate and supersede v1.6.2; normalized values are not comparable one-to-one across these releases. Wrappers remain excluded from the median.</p>}
    <p className="mt-2">Costs use each row’s documented price reference and measured usage on this draw. Subject-topic and use-case radars come from stored per-item results; only aggregates are published.</p>
    <p className="mt-2">Sliders, presets and What-If change your view; they do not change the official result. Wrappers and subsidised systems are listed below the ranking.</p>
    <p className="mt-2 text-xs break-all">Results SHA-256 {sha256} · categories SHA-256 {categoriesSha256} · scoring source SHA-256 {a.source_sha256}.</p>
  </>;
  const sets = a.v16.item_sets;
  const v161 = a.revision === 'v1.6.1';
  const amendments = (a as unknown as { amendments?: Array<{ date: string; revision: string; text: string }> }).amendments ?? [];
  const hasA4 = a.systems.some((s) => (s as { a4?: unknown }).a4);
  const revisionHistory = (a as unknown as { revision_history?: Array<{ revision: string; date: string; summary: string }> }).revision_history ?? [];
  const off = a.v16.equating.offsets;
  const byDay = new Map<string, string[]>();
  const methodSystems = a.systems.filter((s) => !hiddenApi.has(s.key));
  for (const s of methodSystems) if (s.last_measured_on) byDay.set(s.last_measured_on, [...(byDay.get(s.last_measured_on) ?? []), nameLabel(s.display, methodSystems)]);
  const measuredDays = [...byDay.entries()].sort(([x], [y]) => x.localeCompare(y));
  const failures = methodSystems.map((s) => {
    const v = Object.values((s as unknown as { validity?: Record<string, { invalid_rate: number; n: number }> }).validity ?? {});
    // v1.7.7: A4 re-run rows carry answered/total instead of per-type validity.
    const st = (s as unknown as { a4?: unknown; status?: { answered_ok: number; rows: number } });
    if (st.a4 && st.status) return [nameLabel(s.display, methodSystems), st.status.rows - st.status.answered_ok, st.status.rows] as [string, number, number];
    return [nameLabel(s.display, methodSystems), Math.round(v.reduce((t, c) => t + c.invalid_rate * c.n, 0)), v.reduce((t, c) => t + c.n, 0)] as [string, number, number];
  });
  const confidenceOnly = methodSystems.filter((s) => { const sup = Object.values((s as unknown as { support?: Record<string, string> }).support ?? {}); return sup.length > 0 && sup.every((x) => x === 'confidence'); }).map((s) => short(s.display));
  return <>
    {scope !== 'all' && <BoardSplit scope={scope} history={revisionHistory} preliminary={preliminary} />}
    <JevArchitectureMethod />
    {categories.language_cells && <p className="bh-muted mt-2 text-sm" data-bh-jev-language-method>{languagePoolNote(categories.language_cells)}</p>}
    {hiddenApi.size > 0 && <p className="bh-muted mt-2 text-xs" data-bh-jev-method-scope-note>Per-system method lists on this board cover the open-weights systems and the Jev reference; the hosted API offerings&apos; lists are on the <a className="text-accent underline" href="/jev-models/api#jev16-method">API leaderboard</a>.</p>}
    {amendments.length > 0 && <div data-bh-jev16-amendments>
      <h3 className="mt-4 text-lg font-semibold">Method amendments</h3>
      <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">{amendments.map((m) => <li key={`${m.date}-${m.revision}`}>{m.text}</li>)}</ul>
      {hasA4 && <p className="bh-muted mt-1 text-sm" data-bh-jev16-a4-exception>The v1.6.1 amendments above say hosted APIs are no longer equated. {A4_EXCEPTION}</p>}
    </div>}
    <h3 className="mt-4 text-lg font-semibold">Rotating item sets</h3>
    <p className="bh-muted mt-1 text-sm">Each release draws fresh sealed decisions from a larger reserve. Self-hosted open-weights models (run offline on our own GPU pods or Sandy) answer S and P; {v161 ? 'externally hosted models answer the same full set (S and P) as the self-hosted systems since v1.6.1, so hosted APIs are no longer equated.' : 'externally hosted models answer only the API subset A and P.'}</p>
    <div className="mt-2 overflow-x-auto"><table className="text-left text-sm tabular" data-bh-jev16-rotation>
      <thead><tr>{['Set', 'Items', 'Choice', 'Noul', 'Score', 'Answered by'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{sets.map((s) => <tr key={s.set} className="border-t border-line"><th scope="row" className="p-2">{s.set} · {s.name}</th><td className="p-2">{s.items.toLocaleString('en-US')}</td>
        <td className="p-2">{s.by_type.choice}</td><td className="p-2">{s.by_type.noul}</td><td className="p-2">{s.by_type.score}</td><td className="p-2">{s.answered_by}</td></tr>)}</tbody>
    </table></div>
    {hasA4 && <p className="bh-muted mt-1 text-xs" data-bh-jev16-a4-set-note>Not in the table above (frozen release data): API set A4 · 300 never-used sealed items, answered together with P by the {A4_ROWS} API endpoints re-run on 6 Oct 2026 (the {A4_RANKED} ranked offerings and the classifier.dev wrapper); retired after that run.</p>}
    <ul className="bh-muted mt-2 list-disc space-y-1 pl-5 text-sm">
      <li>Self-hosted systems: {a.v16.counts.selfhosted_input.toLocaleString('en-US')} items (S {a.v16.counts.S.toLocaleString('en-US')} + P {a.v16.counts.P}). {v161 ? `Hosted APIs: ${a.v16.counts.selfhosted_input.toLocaleString('en-US')} items (S ${a.v16.counts.S.toLocaleString('en-US')} + P ${a.v16.counts.P}), the same as self-hosted systems; A (${a.v16.counts.A}) is the part of S that earlier API measurements used.` : `Hosted APIs: ${a.v16.counts.api_input} items (A ${a.v16.counts.A} + P ${a.v16.counts.P}).`}{hasA4 && ` ${A4_EXCEPTION}`}</li>
      <li>A sealed item is scored in at most three releases, then retired. An item used in one release is not drawn again in the next. If coverage minimums cannot be met, the release waits for newly reviewed items.</li>
      <li>The selection seed is committed (SHA-256) before any inference, and the draw is a deterministic function of policy, seed and item id.</li>
    </ul>
    <h3 className="mt-4 text-lg font-semibold">API-exposure rule</h3>
    <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">
      <li>An external exposure is any sealed item sent to an endpoint we do not control: closed APIs, and open-weights models reached through third-party hosts, routers or a submitter&apos;s endpoint. Timeouts count as exposure.</li>
      <li>{v161 ? 'From v1.6.1 hosted models receive the full item set (S plus P); items they had already answered were reused and only the missing sealed items were sent. Hosted models are' : 'Hosted models receive only the release&apos;s API subset A plus the public set P, and are'} re-measured at most once every three refresh releases unless a verified new model version ships. Between measurements they keep their last score with its measurement date.</li>
      <li>Every externally sent sealed item is logged before dispatch. An item exposed to a provider is never scored again for that provider; once two different providers have received it, it retires for everyone. In v1.6.0 Jev 1.13.0 and Fastino GLiNER-2.5-Decide both received the same A, so A retires globally.{v161 ? ' With the v1.6.1 amendment every v1.6.0 sealed item has been seen by at least two providers, so the whole v1.6.0 sealed draw is retired for future releases.' : ''}</li>
    </ul>
    <h3 className="mt-4 text-lg font-semibold">Public-versus-sealed gap penalty</h3>
    <p className="bh-muted mt-1 text-sm">Intelligence is half public, half sealed. A system whose public score exceeds its sealed score by more than the field-median gap (G_med = {one(a.G_med)} points{a.G_med_flag_gt10 ? ', flagged above 10' : ''}) plus 8 points loses one Intelligence point per excess point. Hosted APIs are compared on P versus A against the same self-hosted systems&apos; P-versus-A gap ({one(a.G_med_api_basis_P_vs_A)} points).</p>
    <h3 className="mt-4 text-lg font-semibold">{v161 ? 'Hosted APIs (not equated since v1.6.1)' : 'Comparable scores for hosted APIs'}</h3>
    {v161 && <p className="bh-muted mt-1 text-sm" data-bh-jev16-no-equating>Hosted APIs that answered the full set are scored exactly like self-hosted systems; no equating offset is applied to them. Category and language values stay raw.{a.systems.some((s) => (s as { a4?: unknown }).a4) && ' Exception on the live boards: API rows re-run on the fresh API set A4 (v1.7.7) answered A4 ∪ P (600 items) and are equated with the A2/A3 supplement method; OpenAI Decisions the same way on A5 ∪ P (v1.7.10; see Open weights and API offerings above).'}</p>}
    {!v161 && <p className="bh-muted mt-1 text-sm">{a.v16.equating.rule.charAt(0).toUpperCase() + a.v16.equating.rule.slice(1)}. Offsets in this run: Intelligence {off.I >= 0 ? '+' : ''}{off.I.toFixed(2)}, Calibration {off.C >= 0 ? '+' : ''}{off.C.toFixed(2)}. {a.v16.equating.pool_note} Category and language values stay raw and unequated.</p>}
    <h3 className="mt-4 text-lg font-semibold">Headline and Composite</h3>
    <p className="bh-muted mt-1 text-sm">Capability = mean(Intelligence, Calibration) for systems within twice the Jev 1.13.0 cost and median latency (the official caps; the sliders change only your view). {scope === 'all' ? `The Composite (option ${a.headline}) is the equal-weight harmonic mean of Intelligence, Calibration, Speed and Cost with the v1.5 low-axis gates; it remains secondary.` : `Composite (option ${a.headline}): ${COMPOSITE_DEFINITION} It leads the API board and is secondary on open weights.`} Request types Choice, Noul and Score weigh equally; tiers weigh easy {a.tier_weights.easy}, standard {a.tier_weights.standard}, hard {a.tier_weights.hard}, judge {a.tier_weights.judge}.</p>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-class-reference>Jev-class caps use a fixed reference: Jev 1.13.0 as measured in v1.5 (p50 0.62 s, USD 0.0323 per 1,000 decisions); caps = 2x (1.23 s, USD 0.0646). Jev&apos;s own v1.6 p50 is 0.24 s.</p>
    <p id="jev-costs" className="bh-muted mt-1 text-sm">Costs of v1.6-measured systems carry each system&apos;s published v1.5.4 cost per 1,000 decisions (pricing rules unchanged; v1.6 item lengths differ) unless the row says otherwise; Fastino&apos;s is an estimate from its published tariff and measured tokens.</p>
    {a.noul_method?.applied === 'O1S' && <>
    <h3 className="mt-4 text-lg font-semibold">Noul decisiveness and Score baseline (addendum B)</h3>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-noul-method>Scored with method option B (scorer setting {a.noul_method?.applied ?? 'O0'}), selected on 3 Oct 2026 after the v1.6 scores were known and disclosed as a post-results change. Each split × type competence is clipped at 0 before the type weighting, so a type answered no better than chance counts as chance instead of negative. The Score chance baseline is the error of always predicting the mid-scale level, so a flat know-nothing distribution earns about 0. A Score cell whose golds all sit at mid-scale keeps the v1.5 random-level baseline; this only occurs in small breakdown and bootstrap cells. Calibration is unchanged. This run: G_med = {a.G_med == null ? "—" : a.G_med.toFixed(2)} points{v161 ? '.' : <>; hosted-API offsets Intelligence {off.I >= 0 ? '+' : ''}{off.I.toFixed(2)}, Calibration {off.C >= 0 ? '+' : ''}{off.C.toFixed(2)}.</>}</p>
    </>}
    <h3 className="mt-4 text-lg font-semibold">Failed requests and very long items</h3>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-failures>{a.v16.long_items_note} A failed, refused or unparseable answer counts as wrong for Intelligence and stays in the denominator; it does not enter Calibration (the v1.5 rule, applied to every system).
      {' '}Failed answers per system: {failures.map(([name, n, total]) => `${name} ${n}/${total}`).join(' · ')}.</p>
    <h3 className="mt-4 text-lg font-semibold">Calibration basis</h3>
    <p className="bh-muted mt-1 text-sm" data-bh-jev16-calibration-basis>Systems that return a full probability distribution are calibrated on all components (top-label error, plus distribution distance for Choice and ranked-probability error for Score).
      {confidenceOnly.length > 0 ? ` ${confidenceOnly.join(', ')} return${confidenceOnly.length === 1 ? 's' : ''} a single confidence value, so ${confidenceOnly.length === 1 ? 'its' : 'their'} Calibration is the top-label error only and is not like-for-like with full-distribution systems.` : ''}</p>
    {(a as unknown as { overnight?: OvernightNotes }).overnight && <Overnight o={(a as unknown as { overnight: OvernightNotes }).overnight} hiddenApi={hiddenApi} a4={hasA4 ? { exception: A4_EXCEPTION, apiKeys: new Set((apiA4 as { rows: Array<{ key: string; n_rows: number }> }).rows.map((r) => r.key)), sealed: (apiA4 as { rows: Array<{ n_rows: number }> }).rows[0].n_rows - a.v16.counts.P } : null} />}
    {scope === 'all' && revisionHistory.length > 0 && <div data-bh-jev16-revision-history>
      <h3 className="mt-4 text-lg font-semibold">Revision history</h3>
      <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">{revisionHistory.map((r) => <li key={r.revision}><b>{r.revision}</b> · {r.date} · {r.summary}</li>)}</ul>
    </div>}
    <h3 className="mt-4 text-lg font-semibold">Provenance</h3>
    {measuredDays.length > 0 && <p className="bh-muted mt-1 text-sm" data-bh-jev16-measured-days>Measured on the v1.6 pool (run completion day, UTC): {measuredDays.map(([day, names]) => `${day}: ${names.join(', ')}`).join(' · ')}.</p>}
    <p className="bh-muted mt-1 break-all text-xs">Aggregate files: results sha256 {sha256} · categories sha256 {categoriesSha256} · dated carry sha256 {carrySha256}{(a as unknown as { cellSupplementSha256?: string }).cellSupplementSha256 && <> · live category union (<code>{JEVBENCH_S_CATEGORY_CELLS_ARTIFACT}</code>) sha256 {(a as unknown as { cellSupplementSha256?: string }).cellSupplementSha256}</>}. Scoring source sha256 {a.source_sha256}. The method, release data and carry artifact are independently hashable.</p>
  </>;
}

type OvernightNotes = { round: string; scored_utc: string; a2_note?: string | null; notes?: string[];
  exposure?: Record<string, { display?: string; sealed_items_exposed?: number; draws?: string; note?: string }> };

// Review 6 Oct 2026: the frozen overnight note (part of the hashed artifact, so not edited) still gives Sage's pre-amendment
// cost over all 600 rows; the v1.6.1 cost rule prices the common item set, which puts Sage inside the cost cap.
const SAGE_PRE_AMENDMENT_COST = 'over all 600 answered rows: USD 0.0766/1,000 decisions. It exceeds the frozen Jev-class cost cap and is excluded from the Capability headline.';
// The frozen overnight notes repeat the Jev-class reference paragraph that Method already shows under "Headline and
// Composite" (data-bh-jev16-class-reference); drop the repeat and keep the rest of that note.
const CLASS_REFERENCE_REPEAT = /^Jev-class caps use a fixed reference: Jev 1\.13\.0 as measured in v1\.5 \([^)]*\); caps = 2x \([^)]*\)\. Jev's own v1\.6 p50 is 0\.24 s\. /;
const overnightErratum = (note: string) => (note.includes(SAGE_PRE_AMENDMENT_COST)
  ? note.replace(SAGE_PRE_AMENDMENT_COST, 'over all 600 answered rows: USD 0.0766/1,000 decisions. Superseded by the v1.6.1 cost rule (common item set): USD 0.0247/1,000 decisions, inside the Jev-class cost cap.')
  : note).replace(CLASS_REFERENCE_REPEAT, '');

function Overnight({ o, hiddenApi, a4 }: { o: OvernightNotes; hiddenApi: ReadonlySet<string>; a4: { exception: string; apiKeys: ReadonlySet<string>; sealed: number } | null }) {
  const exp = Object.entries(o.exposure ?? {})
    // Every exposure entry is a hosted endpoint (keys can name a mode, e.g. wity-1-auto); the open board keeps only the Jev reference.
    .filter(([key]) => !hiddenApi.size || key === JEV_REFERENCE_KEY);
  return <div data-bh-jev16-overnight-method>
    <h3 className="mt-4 text-lg font-semibold">Overnight full re-measure (4–5 Oct 2026)</h3>
    <p className="bh-muted mt-1 text-sm">Every system with a reproducible recipe was re-run on the v1.6.0 pool overnight with the same pinned inputs and scorer (method option B / O1S). This page uses scoring round {o.round} ({o.scored_utc}). Only complete runs (1,500 items self-hosted, the full API input for hosted APIs) are ranked; partial runs are never ranked, and systems not yet re-measured keep their dated v1.5.x score in the separate table.</p>
    {o.notes && o.notes.length > 0 && <ul className="bh-muted mt-1 list-disc space-y-1 pl-5 text-sm">{o.notes.map((n, i) => <li key={i}>{overnightErratum(n)}</li>)}</ul>}
    {a4 && <p className="bh-muted mt-1 text-sm" data-bh-jev16-overnight-a4-exception>Display note on the overnight text above (frozen release data). {a4.exception}</p>}
    {o.a2_note && <><h3 className="mt-4 text-lg font-semibold">Supplementary API draws A2 and A3</h3><p className="bh-muted mt-1 text-sm" data-bh-jev16-a2>{o.a2_note}</p></>}
    {exp.length > 0 && <><h3 className="mt-4 text-lg font-semibold">Per-model exposure counts (hosted and author-hosted endpoints)</h3>
      <div className="mt-2 overflow-x-auto"><table className="text-left text-sm tabular" data-bh-jev16-exposure>
        <thead><tr>{['System (provider)', 'v1.6 sealed items sent', 'Scored sealed set', 'Status'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
        <tbody>{exp.map(([k, e]) => {
          // Review 6 Oct 2026: the frozen table predates the A4 re-run; rows measured on A4 u P show what was sent on 6 Oct.
          const re = a4?.apiKeys.has(k) ? { sent: a4.sealed, draws: 'A4 (retired after this run)', note: 'measured 6 Oct 2026 on A4 ∪ P (v1.7.7)' } : null;
          return <tr key={k} className="border-t border-line"><th scope="row" className="p-2 font-normal">{e.display ?? k}</th>
          <td className="p-2">{re ? re.sent : e.sealed_items_exposed ?? '—'}</td><td className="p-2">{re?.draws ?? e.draws ?? '—'}</td><td className="p-2 bh-muted">{re?.note ?? e.note ?? ''}</td></tr>; })}</tbody>
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
        // v1.7.7: A4 re-run rows come as system aggregates without per-type support or decisiveness figures.
        const a4Row = !!(s as { a4?: unknown }).a4;
        // v1.7.8: rows added after the release (Liquid d1) publish no decisiveness figure.
        const addon = !!(s as { full_api_addon?: unknown }).full_api_addon;
        return <tr key={s.key} className="border-t border-line" {...apiRowProps(s.key, hiddenApi)}>
          <th scope="row" className="p-2 font-normal whitespace-nowrap">{short(s.display)}{s.listing === JEV_SCOPE_LISTING.reference && <span className="bh-muted"> · reference</span>}</th>
          <td className="p-2">{one(I)}{I != null && I < 50 && <span className="bh-muted ml-1 text-xs" data-bh-below-gate>below gate</span>}</td>
          {TYPES.map((t) => <td key={t} className="p-2">{a4Row ? <span className="bh-muted">—</span> : (support[t] ?? 'unsupported') === 'unsupported' ? <span className="bh-muted">not supported</span> : support[t]}</td>)}
          <td className="p-2">{d && d.supported ? pct(d.decisive_rate) : <span className="bh-muted">{a4Row || addon ? '—' : 'not supported'}</span>}</td>
          <td className="p-2">{d && d.supported ? pct(d.acc_among_decisive) : '—'}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </section>;
}

// Review 6 Oct 2026: same value the Capability list prints, (Intelligence + Calibration) / 2 (the stored 97.35 rounded to 97.3).
const rosterCapability = (s: { capability?: number | null; axes?: { intelligence?: number | null; calibration?: number | null } }) => {
  const i = s.axes?.intelligence, c = s.axes?.calibration;
  return one(i != null && c != null ? (i + c) / 2 : s.capability);
};
const ENDPOINT_TAG: Record<string, string> = { api: 'hosted API', demo: 'author-hosted demo' };
// Review 6 Oct 2026: the roster says per row which score basis it is, and marks estimated costs like the charts do.
const basisLine = (s: { a4?: { n_items: number; subset?: string } }, fullItems: number) => s.a4 ? `${s.a4.subset ?? 'A4'} ∪ P (${s.a4.n_items} items, equated)` : `full set (${fullItems.toLocaleString('en-US')} items)`;
const costCell = (cost: { usd_per_1000?: number | null; kind?: string | null } | null | undefined) => <>{cost?.kind === 'estimate' && <span className="bh-thin-tag bh-est-tag mr-1 align-middle" data-bh-jev14-est>est.</span>}{usd(cost?.usd_per_1000)}</>;
const rosterStatus = (listing: string | null, reason: string | null) => listing === 'listed' ? 'configuration variant · not ranked'
  : listing ? `${NOT_RANKED[listing] ?? listing.replace(/_/g, ' ')} · not ranked` : reason ?? 'not ranked';

// v1.7.1 (Florian 6 Oct 2026): "the page with the API offerings needs to contain all the API offerings". One table lists
// every row the API scope holds (lib jevApiRoster): ranked on this release, unranked variants, carried v1.5.x rows and
// catalogue rows (wrappers, partial runs). Display only; nothing here is ranked or re-scored, and no row is dropped.
function ApiRoster({ a, carry, listed, eligibility }: { a: JevV16ReleaseArtifact; carry: JevV16Carry; listed: JevApiListedRow[];
  eligibility: ReadonlyMap<string, { status: 'eligible' | 'outside'; reason: string }> }) {
  const { ranked, variants, carried } = jevApiRoster(a, carry.rows);
  const total = ranked.length + variants.length + carried.length + listed.length;
  // Review 6 Oct 2026: wrappers (classifier.dev) are their own group, apart from the configuration variants.
  const configVariants = variants.filter((s) => (s.listing as string) !== 'wrapper'), wrappers = variants.filter((s) => (s.listing as string) === 'wrapper');
  const variantRow = (s: (typeof variants)[number]) => <tr key={s.key} className="border-t border-line">
    <th scope="row" className="p-2 font-normal">{name(s.display, s.repo, s.key, s.endpoint_kind)}</th>
    <td className="p-2 bh-muted">{rosterStatus(s.listing, s.not_ranked_because ?? null)}<span className="block text-xs">{basisLine(s as { a4?: { n_items: number } }, a.v16.counts.selfhosted_input)}</span></td>
    <td className="p-2">{one(s.jevbench_score)}</td><td className="p-2">{rosterCapability(s)}</td>
    <td className="p-2">{costCell(s.cost)}</td><td className="p-2">{sec(s.speed?.p50_s_adjusted)}</td></tr>;
  const head = (label: string, n: number) => <tr className="border-t border-line"><th colSpan={6} scope="colgroup" className="p-2 pt-4 text-left text-sm font-semibold">{label} ({n})</th></tr>;
  const name = (display: string, href: string | null | undefined, key: string, endpoint: string | null | undefined) => <>
    {href ? <a className="text-accent underline" href={href} target={href.startsWith('/') ? undefined : '_blank'} rel={href.startsWith('/') ? undefined : 'noopener noreferrer'} data-bh-jev-api-roster-row={key}>{display}</a>
      : <span data-bh-jev-api-roster-row={key}>{display}</span>}
    {endpoint && ENDPOINT_TAG[endpoint] && <span className="bh-muted block text-xs" data-bh-jev-api-roster-endpoint={endpoint}>{ENDPOINT_TAG[endpoint]}</span>}
  </>;
  return <section className="bh-panel mt-10 p-5" id="jev-api-roster" aria-labelledby="jev-api-roster-title" data-bh-jev-api-roster>
    <h2 id="jev-api-roster-title" className="text-2xl font-bold">Every API offering we have measured ({total})</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">No API offering is left out. “API offering” means an endpoint we do not run ourselves: vendor APIs and author-hosted demos (tagged). Ranked rows outside the Jev-class cost or latency caps (2× Jev) keep their Composite rank and appear below the divider of the Capability ranking. Only rows measured on {a.revision} are ranked; {carry.rows.length > 0 ? <>APIs not yet re-measured keep their dated v1.5.x score, which is on the v1.5 scale and not comparable with {a.revision} scores (a v1.5 Composite near 0 means a low-axis gate applied).</> : 'every offering is measured on the v1.6.1 scale, on the full 1,500-item set or on A4 ∪ P (600 items, equated); none keeps an older score.'}</p>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm tabular" data-bh-jev-api-roster-table>
      <caption className="sr-only">All hosted API offerings measured on JevBench, by status</caption>
      <thead><tr>{['System', 'Status', 'Composite', 'Capability', 'Cost / 1,000', 'Median latency'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>
        {head(ranked.some((s) => (s as { a4?: unknown }).a4) ? `Ranked on the ${a.revision} scale (full set, or A4 ∪ P re-run equated)` : `Ranked on ${a.revision}`, ranked.length)}
        {ranked.map((s) => { const e = eligibility.get(s.key); return <tr key={s.key} className="border-t border-line">
          <th scope="row" className="p-2 font-normal">{name(s.display, s.repo, s.key, s.endpoint_kind)}</th>
          <td className="p-2">Composite #{s.rank}<span className="bh-muted block text-xs" data-bh-jev-api-roster-basis>{basisLine(s as { a4?: { n_items: number } }, a.v16.counts.selfhosted_input)}</span>{e?.status === 'outside' && <span className="bh-muted block text-xs">outside Jev-class caps: {e.reason}</span>}</td>
          <td className="p-2">{one(s.jevbench_score)}</td><td className="p-2">{rosterCapability(s)}</td>
          <td className="p-2">{costCell(s.cost)}</td><td className="p-2">{sec(s.speed?.p50_s_adjusted)}</td></tr>; })}
        {configVariants.length > 0 && head(`Also measured on ${a.revision}, listed, not ranked`, configVariants.length)}
        {configVariants.map(variantRow)}
        {wrappers.length > 0 && head('Wrappers that serve Jev (listed, never ranked, not class-assessed)', wrappers.length)}
        {wrappers.map(variantRow)}
        {carried.length > 0 && head('Carried from v1.5.x, not yet re-measured (v1.5 scale)', carried.length)}
        {/* v1.7.2 (Florian 6 Oct 2026, Part 9): say why these rows were not re-run; no v1.5 -> v1.6 conversion exists, so none is shown. */}
        {carried.length > 0 && <tr><td colSpan={6} className="bh-muted p-2 pt-0 text-xs" data-bh-jev-api-roster-carry-why>Why not re-run yet: hosted APIs are re-measured at most once every three refresh releases (API-exposure rule), and the v1.6.0 sealed set is now retired, so a new run needs a fresh sealed draw. Re-runs are being arranged with each provider; some first need a new key or confirmation from the provider. There is no validated conversion from the v1.5 to the v1.6 scale, so these scores are shown as measured, with their date.</td></tr>}
        {carried.map((r) => <tr key={r.key} className="border-t border-line">
          <th scope="row" className="p-2 font-normal">{name(r.display, r.source_url ?? r.repo, r.key, (r as { endpoint_kind?: string | null }).endpoint_kind)}</th>
          <td className="p-2 bh-muted">{r.measured_label}{PUBLIC_SET.get(r.key) && <a className="text-accent block text-xs underline" href="#jev-api-public-set" data-bh-jev-api-roster-public={r.key}>v1.6 public set ({PUBLIC_SET.get(r.key)!.measured_on}): Capability {one(PUBLIC_SET.get(r.key)!.capability)}</a>}</td>
          <td className="p-2">{one(r.composite_v15)}<span className="bh-muted"> (v1.5)</span></td><td className="p-2">{one(r.capability)}<span className="bh-muted"> (v1.5)</span></td>
          <td className="p-2">{usd(r.cost?.usd_per_1000)}</td><td className="p-2">{sec(r.speed.p50_s_adjusted)}</td></tr>)}
        {listed.length > 0 && head('Listed only, never ranked (wrappers, partial runs)', listed.length)}
        {listed.map((w) => <tr key={w.key} className="border-t border-line">
          <th scope="row" className="p-2 font-normal">{name(w.display, w.href, w.key, w.endpoint_kind)}</th>
          <td className="p-2 bh-muted">{rosterStatus(w.listing, w.reason)}{w.reason && w.listing && <span className="block text-xs">{w.reason}</span>}{w.revision && <> · <a className="text-accent underline" href={`/jev-models/${w.revision}`}>{w.revision}</a></>}</td>
          <td className="p-2">{one(w.composite_v15)}{w.composite_v15 != null && <span className="bh-muted"> (v1.5)</span>}</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">—</td></tr>)}
      </tbody>
    </table></div>
  </section>;
}

// v1.7.4 (Florian 6 Oct 2026, Part 11): "stelle sicher, dass alle API Provider ... getestet und auf der Seite gescored sind".
// Reachable API offerings without a v1.6 measurement answered the 300 public v1.6 items (no sealed items, so no exposure).
// Scored with the pinned v1.6.1 scorer restricted to P (no sealed side: no gap penalty, no equating). Shown dated, unranked,
// with anchors (rows ranked above, re-scored on the same 300 items) so readers can compare inside this table only.
// v1.7.7: rows that now have a full A4 u P result are board systems; only the rest stay preliminary or pending.
function apiChartExtras(carry: JevV16Carry, measured: ReadonlySet<string>) {
  const meta = new Map<string, unknown>(carry.rows.map((r) => [r.key, r]));
  const { prelim, pending } = jevApiPreliminaryRows(apiPublicSet, meta);
  return [...prelim, ...pending].filter((r) => !measured.has(r.key));
}
type JevApiPublicRow = { key: string; display: string; role: 'anchor' | 'carried' | 'wrapper'; measured_on: string; n_items: number; n_ok: number;
  intelligence: number | null; calibration: number | null; capability: number | null; p50_s: number | null; p50_s_adjusted: number | null;
  cost_kind: 'measured' | 'estimate'; latency_adjustment?: string | null;
  usd_per_1000: number | null; v15_composite?: number | null; v15_capability?: number | null; v15_measured?: string | null; note?: string | null; href?: string | null };
const PUBLIC_ROWS = (apiPublicSet as { rows: JevApiPublicRow[] }).rows;
const PUBLIC_SET: ReadonlyMap<string, JevApiPublicRow> = new Map(PUBLIC_ROWS.filter((r) => r.role === 'carried').map((r) => [r.key, r]));
function ApiPublicSet({ measured }: { measured: ReadonlySet<string> }) {
  // v1.7.7: offerings with a full A4 u P result leave this table; the anchors stay for the rows still waiting.
  const waiting = PUBLIC_ROWS.filter((r) => r.role !== 'anchor' && !measured.has(r.key));
  if (waiting.length === 0) return null;
  const rows = [...PUBLIC_ROWS.filter((r) => r.role === 'anchor'), ...waiting].sort((x, y) => (y.capability ?? -1) - (x.capability ?? -1));
  // Same Jev-class caps as the rankings: 2x the frozen v1.5 Jev reference cost and median latency, on the same cost basis and
  // demo-endpoint latency adjustment the rankings use. Wrappers (they serve Jev) are not class-assessed.
  const ref = { cost: JEV_V16_FROZEN_LIMITS.cost / 2, latency: JEV_V16_FROZEN_LIMITS.latency / 2 };
  const outside = (r: JevApiPublicRow) => [r.usd_per_1000 == null ? 'no published price' : r.usd_per_1000 > JEV_V16_FROZEN_LIMITS.cost ? `cost ${(r.usd_per_1000 / ref.cost).toFixed(1)}×` : null,
    r.p50_s_adjusted != null && r.p50_s_adjusted > JEV_V16_FROZEN_LIMITS.latency ? `latency ${(r.p50_s_adjusted / ref.latency).toFixed(1)}×` : null]
    .filter(Boolean).join(', ').replace(/×$/, '× the Jev v1.5 reference') || null;
  const groups: [string, JevApiPublicRow[]][] = [
    ['Within the Jev-class caps (cost and median latency at most 2× the Jev v1.5 reference)', rows.filter((r) => r.role !== 'wrapper' && !outside(r))],
    ['Outside the Jev-class caps', rows.filter((r) => r.role !== 'wrapper' && outside(r))],
    ['Wrappers (serve Jev, listed, never ranked, not class-assessed)', rows.filter((r) => r.role === 'wrapper')]];
  const pending = ((apiPublicSet as { pending?: { key: string; display: string; reason: string }[] }).pending ?? []).filter((x) => !measured.has(x.key));
  const meta = apiPublicSet as { set_label: string; scorer: string };
  return <section className="bh-panel mt-10 p-5" id="jev-api-public-set" aria-labelledby="jev-api-public-set-title" data-bh-jev-api-public-set>
    <h2 id="jev-api-public-set-title" className="text-2xl font-bold">Public-set re-runs (v1.6, 300 public items): not ranked</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">API offerings not yet re-measured on the full v1.6 set answered the 300 public v1.6 items (no sealed items, so no provider saw held-out data). These figures are <b>not comparable with the 1,500-item rankings above</b>; compare them with the <b>anchor</b> rows, which are ranked above and scored on the same 300 items. The v1.6 items are harder than v1.5: Intelligence reads lower for nearly every system (about 6 points for Jev, 11–17 for most mid-table APIs), so a lower figure than the older v1.5 score is not by itself a decline. Full sealed re-runs follow with the next fresh sealed draw.</p>
    <details className="bh-muted mt-2 max-w-4xl text-sm"><summary className="cursor-pointer">How these figures are measured</summary><p className="mt-1">Same v1.6.1 scorer restricted to the {meta.set_label} ({meta.scorer}). Calibration on 300 items reads lower than on 1,500, and without a sealed side there is no gap penalty. Failed or refused requests count as wrong; rows with fewer than {(apiPublicSet as { min_answered: number }).min_answered} answers are not shown. Cost is the list price as measured (or as documented in v1.5 for demo endpoints without a tariff); latency was measured from Helsinki.</p></details>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm tabular" data-bh-jev-api-public-table>
      <caption className="sr-only">API offerings scored on the 300 public v1.6 items, with anchors</caption>
      <thead><tr>{['System', 'Capability (public set)', 'Intelligence', 'Calibration', 'Measured', 'Answered', 'Cost / 1,000', 'Median latency', 'Older v1.5 score'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{groups.filter(([, g]) => g.length > 0).flatMap(([label, g]) => [<tr key={label} className="border-t border-line"><th colSpan={9} scope="colgroup" className="p-2 pt-4 text-left text-sm font-semibold">{label} ({g.length})</th></tr>, ...g.map((r) => <tr key={r.key} className="border-t border-line" data-bh-jev-api-public-row={r.key} data-role={r.role} data-jev-class={r.role === 'wrapper' ? 'wrapper' : outside(r) ? 'outside' : 'eligible'}>
        <th scope="row" className="p-2 font-normal">{r.href ? <a className="text-accent underline" href={r.href}>{r.display}</a> : r.display}
          {r.role !== 'carried' && <span className="bh-thin-tag ml-1.5 align-middle">{r.role}</span>}
          {r.note && r.role !== 'wrapper' && <span className="bh-muted block text-xs">{r.note}</span>}
          {r.role !== 'wrapper' && outside(r) && <span className="bh-muted block text-xs">{outside(r)}</span>}</th>
        <td className="p-2 font-semibold">{one(r.capability)}</td>
        <td className="p-2">{one(r.intelligence)}</td><td className="p-2">{one(r.calibration)}</td>
        <td className="p-2 whitespace-nowrap">{r.measured_on}</td>
        <td className="p-2">{r.n_ok}/{r.n_items}</td>
        <td className="p-2">{usd(r.usd_per_1000)}{r.cost_kind === 'estimate' && <span className="bh-muted block text-xs">estimate, as in v1.5</span>}</td>
        <td className="p-2">{sec(r.p50_s_adjusted)}{r.latency_adjustment && <span className="bh-muted block text-xs">raw {sec(r.p50_s)}, ×2 demo adjustment</span>}</td>
        <td className="p-2 bh-muted">{r.role === 'anchor' ? 'ranked above on the full v1.6.1 set' : r.v15_capability != null || r.v15_composite != null ? <>{r.v15_capability != null && <>Capability {one(r.v15_capability)} · </>}Composite {one(r.v15_composite)}<span className="block text-xs">{r.v15_measured ?? 'v1.5'}, older method</span></> : '—'}</td>
      </tr>)])}</tbody>
    </table></div>
    <p className="bh-muted mt-2 text-xs">Rows are ordered by public-set Capability for reading only; the order is not a rank.</p>
    {pending.length > 0 && <p className="bh-muted mt-2 max-w-4xl text-sm" data-bh-jev-api-public-pending>No public-set figure yet: {pending.map((x, i) => <span key={x.key}>{i > 0 && '; '}<b>{x.display}</b> ({x.reason})</span>)}. Their dated v1.5 scores stay in the list above.</p>}
  </section>;
}

export function JevBenchV16Board({ artifact: a, sha256, categories, categoriesSha256, carry, carrySha256, previousKeys, scope = 'all', apiKeys = [], apiListed = [] }: {
  apiListed?: JevApiListedRow[];
  artifact: JevV16ReleaseArtifact; sha256: string; categories: JevV16Categories; categoriesSha256: string; carry: JevV16Carry; carrySha256: string; previousKeys: string[];
  /** v1.7: 'open' = open-weights board with the API toggle, 'api' = API leaderboard, 'all' = archived release as published. */
  scope?: JevScope; apiKeys?: string[];
}) {
  // Fresh native cohorts (v1.6.2, v1.6.3) only ever use the categories passed from their own release; never a historical artifact.
  const fresh = isFreshJevbenchV16Revision(a.revision);
  const v15 = a as unknown as JevV15Artifact; // same per-system aggregate schema (score_v16 extends score_v15)
  // v1.7.3: on scoped boards the Jev reference and API offerings sit at their score position in every ranking section.
  // v1.7.5 (Florian 6 Oct 2026, Part 12): the API board also draws preliminary public-set rows (hatched, unranked, at their
  // score position) and greyed pending rows in both ranking charts. They never enter the compare view or other sections.
  const measuredKeys = new Set(a.systems.map((s) => s.key));
  const extra = scope === 'api' ? apiChartExtras(carry, measuredKeys) : [];
  const preliminary = apiChartExtras(carry, measuredKeys).length > 0;
  const ranked = scope === 'all' ? a.systems.filter((s) => s.ranked).sort(byBoard) : jevScopeDisplayOrder([...a.systems.filter(listedRow), ...(extra as typeof a.systems)]);
  const hiddenApi: ReadonlySet<string> = new Set(scope === 'open' ? apiKeys : []);
  const chartSystems = ranked.map((s) => jevV15BoardSystem(s) as JevV14System);
  const allChartSystems = [...a.systems, ...(extra as typeof a.systems)].map((s) => jevV15BoardSystem(s) as JevV14System);
  const allClass = jevClassView(allChartSystems, { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true });
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
  // v1.7.5: the filter provider must know the API board's preliminary/pending rows, or it hides them after hydration.
  for (const x of extra as Array<{ key: string; display: string; author?: string | null; class?: string | null; licence?: string | null;
    cost?: { usd_per_1000?: number | null } | null; speed?: { p50_s_adjusted?: number | null; p95_s_adjusted?: number | null } | null }>) {
    const e = eligibilityByKey.get(x.key);
    filterRows.push({ key: x.key, display: x.display, provider: x.author || null, family: null, modelClass: x.class ?? null, open: 'no', api: true,
      newInVersion: false, parameters: null, licence: x.licence ?? null, developerPrice: x.cost?.usd_per_1000 ?? null, basePrice: null,
      officialCost: x.cost?.usd_per_1000 ?? null, alternativePrice: null, p50: x.speed?.p50_s_adjusted ?? null, p95: x.speed?.p95_s_adjusted ?? null,
      jevClass: { status: e?.status ?? 'outside', reason: e?.reason ?? 'no v1.6 figure yet' } });
  }
  const allDataKeys = [...new Set([...a.systems, ...a.not_measured].map((row) => row.key))];
  const previous = new Set(previousKeys);
  const viewRows = ranked.map((s) => jevV15BoardRow(s, { isNew: previous.size > 0 && !previous.has(s.key), headline: a.headline }));
  const compareSources = ['v1.6.3', 'v1.6.4'].includes(a.revision) ? freshJevbenchCategoryRows(a.systems) : ranked;
  const compareRows = compareSources.filter((s) => s.listing !== JEV_PRELIMINARY_LISTING && s.listing !== JEV_PENDING_LISTING).map(jevV15CompareRow);
  const named = new Map(a.systems.map((s) => [s.key, short(s.display)]));
  const leader = jevV15LeaderSentence(v15.board[a.headline], (key) => named.get(key) ?? key);
  // v1.7.1 (Florian 6 Oct 2026): ranking headings name the board; the API board leads with the Composite.
  const scopeLabel = scope === 'open' ? 'open weights' : scope === 'api' ? 'API offerings' : undefined;
  const capabilityCharts = <JevBenchV16Charts systems={chartSystems} eligibilitySystems={allChartSystems} revision={a.revision} officialHref="#jev16-method"
    scopeLabel={scopeLabel} outsideOpen={scope === 'api'} headline={scope !== 'api'} />;
  return <JevV15FilterProvider rows={filterRows} apiKeys={scope === 'open' ? apiKeys : undefined}>
    <section data-bh-jevbench-v16-release data-bh-jev-scope={scope}>
      <JevV15FilterVisibilityBridge />
      {scope === 'open' && <JevApiOfferingsToggle measured={a.systems.filter((s) => (s as { scope?: string; listing?: string }).scope === 'api' && (s as { listing?: string }).listing !== 'listed').length} />}
      {scope !== 'api' && capabilityCharts}
      {scope !== 'api' && <JevV15FilterPanel />}
      {scope === 'api' && extra.length > 0 && <p className="mt-6 max-w-4xl text-sm" data-bh-jev-api-preliminary-note><span className="bh-thin-tag bh-partial-tag mr-1.5 align-middle">preliminary</span><b>Hatched rows are preliminary:</b> API offerings scored on the 300 public v1.6 items only (no sealed items, so no gap penalty; Calibration reads a few points lower on 300 items than on 1,500). They are not ranked and compare strictly only with the anchor rows in the public-set table; each row is replaced by its full result once it has been run on a fresh sealed set. <span className="bh-thin-tag bh-partial-tag mx-1 align-middle">pending</span>Greyed rows have no v1.6 figure yet; their v1.5 score is in the tooltip and in the <a className="text-accent underline" href="#jev-api-public-set">public-set table</a>.</p>}
      <JevScoreChart revision={a.revision} rows={viewRows} rankedCount={a.n_ranked} newLabel={null} fairness={null} approvedNote={leader} tieNote={null} capabilityHref="#jev-capability" presets={jevV15SliderPresets(v15)} compactMobile scoreKind="v15" methodLink={{ href: '#jev16-method', label: 'Method notes ↓' }}
        scoreLabel={scopeLabel ? `JevBench Composite Score (${scopeLabel})` : undefined} headline={scope === 'api'} capabilityLabel={scope === 'api' ? 'Capability ↓' : undefined} />
      {scope === 'api' && capabilityCharts}
      {scope === 'api' && <ApiRoster a={a} carry={carry} listed={apiListed} eligibility={eligibilityByKey} />}
      {scope === 'api' && <ApiPublicSet measured={measuredKeys} />}
      {scope === 'api' && <JevV15FilterPanel />}
      <JevCompareV15 rows={compareRows} openDecisions={a.v16.counts.P} sealedDecisions={a.v16.counts.S} categories={jevbenchCategoryView(a.revision, compareRows.map((r) => r.key), { supplement: Boolean(categories.supplement), artifact: fresh || hasApiFullAddendumCategories(categories) ? categories : undefined })} />
      <p className="bh-muted mt-2 max-w-4xl text-xs" data-bh-jev16-radar-note>{categories.supplement ? <>Category radars count each answered item once from the pools named under each radar. API overlay rows use {API_CATEGORY_POOLS}. Raw and unequated; cells under {categories.min_n} answered items are omitted. Per-type and tier radars retain each row&apos;s original measurement pools: A4/A5 rows have 300 open plus 300 sealed items; full-set rows have S {a.v16.counts.S.toLocaleString('en-US')} plus P {a.v16.counts.P}.</> : <>{categories.lane_note} Sealed counts refer to self-hosted S ({a.v16.counts.S.toLocaleString('en-US')}); API rows use their original measured sealed basis.</>}</p>
      <LanguageView carry={carry} scope={scope} a={a} categories={categories} hiddenApi={hiddenApi} />
      <NoulAndGate a={a} hiddenApi={hiddenApi} />
      <JevV15AllDataGrid
        artifact={v15}
        categoryView={jevbenchCategoryView(a.revision, allDataKeys, { supplement: Boolean(categories.supplement), artifact: fresh || hasApiFullAddendumCategories(categories) ? categories : undefined })}
        previousKeys={previousKeys}
        eligibility={allClass}
        metadata={{ families: baseModelFamilies('jevbench', a.systems) }}
        links={{ method: '#jev16-method', pricing: '#jev16-method', revisionNotes: '#jev16-method', addenda: {} }}
      />
      {scope === 'open' && <div className="mt-10"><JevGpuCostCalculator systems={ranked.filter((s) => s.v16.lane !== 'api').map((s) => ({
        key: s.key, display: short(s.display), gpu: (s as { gpu?: string | null }).gpu ?? null, p50_s_raw: s.speed?.p50_s_raw ?? null,
        officialUsdPer1000: s.cost?.usd_per_1000 ?? null, ranked: !!s.ranked }))} /></div>}
      {(!fresh || carry.rows.length > 0) && <DatedCarry carry={carry} hiddenApi={hiddenApi} showExceptions={Boolean(categories.supplement)} />}
      <Method categories={categories} a={a} sha256={sha256} categoriesSha256={categoriesSha256} carrySha256={carrySha256} scope={scope} hiddenApi={hiddenApi} preliminary={preliminary} />
    </section>
  </JevV15FilterProvider>;
}
