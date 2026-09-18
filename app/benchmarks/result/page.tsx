import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import taxonomy from '../../../data/benchmark-taxonomy.json';
import epochEciRaw from '../../../data/raw/epoch-eci.json';
import { getDataset } from '../../../lib/data';
import { getBenchmarkView } from '../../../lib/benchmark-data';
import { getBenchmarkMatrixPage } from '../../../lib/benchmark-matrix-data';
import { latestScores } from '../../../lib/benchmark-view.mjs';
import { formatValue, cellHref, cellAxisId, resultHref, rowWinners, versionLine, cohortLabel, variantLabel } from '../../../lib/benchmark-matrix.mjs';
import caveats from '../../../data/benchmark-caveats.json';
import { SourceScore } from '../../../components/BenchmarkEvidence';
import { humanVersion, isPin } from '../../../lib/version-label';

export const metadata: Metadata = { title: 'Benchmark result' };

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; } };

type EciRecord = { source_model_name: string; organization: string | null; general: number; general_ci_low: number; general_ci_high: number; date: string | null; software: number | null; software_benchmarks: string[] };
const epochEci = epochEciRaw as unknown as { collected_at: string; definition_version: string; source: { license: string; urls: Record<string, string> }; models: EciRecord[] };
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** F-125 (Fable pass 23): a stealth model's org is its own name ("Union Alpha · Union Alpha").
 *  Where the two are the same string, the name is rendered once. */
const sameAsName = (m: { org?: string | null; display_name?: string | null }) =>
  (m.org ?? '').trim().toLowerCase() === (m.display_name ?? '').trim().toLowerCase();

// CR-1.8: one comparison-table cell, with where the number comes from, the same benchmark for the
// other compared models, and the model's other results. Every value here is a dataset value.
export default async function BenchmarkResultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const axisId = typeof p.axis === 'string' ? p.axis : '';
  const modelId = typeof p.model === 'string' ? p.model : '';
  const pinned = p.pinned === '1';
  const view = await getBenchmarkView();
  const { matrix, filterData } = await getBenchmarkMatrixPage();
  const models = new Map(filterData.models.map((m) => [m.id, m]));
  const axis = view.axes.find((a) => a.id === axisId);
  // Index values kept on the model row (Epoch ECI) have no benchmark-view axis, only a matrix row.
  const fieldRow = axis ? undefined : matrix.rows.find((r) => r.id === axisId && !r.ranking);
  const field = fieldRow && taxonomy.model_field_rows.find((f) => f.key === fieldRow.key);
  if ((!axis && !field) || !models.has(modelId)) notFound();
  const compared = (typeof p.models === 'string' ? p.models.split(',') : []).filter((id) => models.has(id)).slice(0, 10);
  if (!compared.includes(modelId)) compared.unshift(modelId);
  const model = models.get(modelId)!;
  const back = pinned ? `/benchmarks?models=${compared.map(encodeURIComponent).join(',')}` : '/benchmarks';
  const groupLabel = new Map(matrix.groups.map((g) => [g.id, g.label]));
  // CR-41.1: a best-of row lists here under the run its value came from; the run on this page is not repeated.
  const others = (matrix.values[modelId] ?? []).map(([i, v]) => ({ row: matrix.rows[i], v })).filter((o) => cellAxisId(o.row, modelId) !== axisId);
  const mergedInto = matrix.rows.find((r) => r.bestOf?.variants.some((x) => x.id === axisId));
  const othersSection = others.length > 0 && <section className="mt-8" aria-labelledby="bh-result-others">
    <h2 id="bh-result-others" className="text-lg font-semibold">{model.display_name}: {others.length} other results</h2>
    <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">{others.map(({ row: o, v }) => <li key={o.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-sm">
      <span className="min-w-0"><Link href={cellHref(o, modelId, compared, pinned)} className="hover:underline">{o.name}</Link><span className="bh-muted block text-xs">{groupLabel.get(o.group)}{o.cohort ? ` · ${o.cohort}` : ''}</span></span>
      <span className="tabular shrink-0">{formatValue(v, o.unit)}</span>
    </li>)}</ul>
  </section>;
  const backLink = <nav aria-label="Breadcrumb" className="text-sm"><Link href={back} className="text-accent hover:underline">← Back to the comparison</Link></nav>;

  if (!axis && fieldRow && field) {
    // Epoch ECI: General ECI is Epoch's published number; Software ECI is our refit of Epoch's
    // published per-benchmark results with Epoch's public method. Both are attached once per family.
    const ds = await getDataset();
    const rows = new Map(ds.models.map((m) => [m.id, m as unknown as { benchmarks?: Record<string, unknown>; epoch_eci_attachment_note?: string }]));
    const valueOf = (id: string) => { const v = rows.get(id)?.benchmarks?.[field.field]; return finite(v) ? v : null; };
    const value = valueOf(modelId);
    if (value == null) notFound();
    const targets = ((ds as unknown as { build_diagnostics?: { epoch_eci_attachment?: { targets?: { source_model_name: string; target_id: string }[] } } })
      .build_diagnostics?.epoch_eci_attachment?.targets) ?? [];
    const recordFor = (id: string) => {
      const t = targets.find((x) => x.target_id === id);
      return epochEci.models.find((r) => t ? r.source_model_name === t.source_model_name : r.general === rows.get(id)?.benchmarks?.epoch_eci) ?? null;
    };
    const software = field.field === 'epoch_eci_software';
    const collected = epochEci.collected_at.slice(0, 10);
    const sourceUrl = software ? epochEci.source.urls.performance : epochEci.source.urls.general;
    const basis = software ? 'computed from Epoch AI published results' : 'published by Epoch AI';
    const record = recordFor(modelId);
    const win = rowWinners(compared.map(valueOf), true);
    return <div className="max-w-4xl">
      {backLink}
      <header className="bh-page-head mt-3">
        <p className="bh-eyebrow">{groupLabel.get(fieldRow.group)} · Epoch AI snapshot {collected}</p>
        <h1 className="text-3xl font-bold tracking-tight">{fieldRow.name}</h1>
        <p className="bh-muted mt-2 max-w-2xl">{fieldRow.description}</p>
      </header>

      <section className="bh-panel p-5" aria-labelledby="bh-result-model">
        <h2 id="bh-result-model" className="bh-muted text-sm">{sameAsName(model) ? '' : `${model.org} · `}<Link href={`/models/${encodeURIComponent(modelId)}`} className="text-accent hover:underline">{model.display_name}</Link></h2>
        <p className="mt-1 text-4xl font-bold tabular" data-bh-result-value>{formatValue(value, fieldRow.unit)}</p>
        <p className="bh-muted mt-1 text-sm">Unit: {fieldRow.unit} · higher is better</p>
        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="bh-muted">Basis</dt>
          <dd>{software
            ? <>Computed by Benchmark Heaven from Epoch AI&apos;s published per-benchmark results and difficulty parameters, with Epoch&apos;s public one-dimensional fit{record?.software_benchmarks.length ? <> over {record.software_benchmarks.length} software benchmarks ({record.software_benchmarks.join(', ')})</> : null}. Epoch does not publish this number itself.</>
            : <>Published by Epoch AI{record && finite(record.general_ci_low) && finite(record.general_ci_high) ? <>, 90% interval {formatValue(record.general_ci_low, fieldRow.unit)}–{formatValue(record.general_ci_high, fieldRow.unit)}</> : null}.</>}</dd>
          {record && <><dt className="bh-muted">Epoch&apos;s row</dt><dd>{record.source_model_name}{record.organization ? ` · ${record.organization}` : ''}{record.date ? ` · model dated ${record.date}` : ''}</dd></>}
          <dt className="bh-muted">Collected</dt><dd>{collected} · definition {epochEci.definition_version} · licence {epochEci.source.license}</dd>
          <dt className="bh-muted">Source</dt><dd><a href={sourceUrl} target="_blank" rel="noreferrer" className="text-accent underline break-all">{sourceUrl} ↗</a></dd>
          {rows.get(modelId)?.epoch_eci_attachment_note && <><dt className="bh-muted">Scope</dt><dd className="bh-muted">{rows.get(modelId)!.epoch_eci_attachment_note}</dd></>}
        </dl>
        <p className="mt-4 text-sm"><a href={fieldRow.url} target="_blank" rel="noreferrer" className="text-accent underline">Benchmark&apos;s primary source ↗</a></p>
      </section>

      <section className="mt-8" aria-labelledby="bh-result-compared">
        <h2 id="bh-result-compared" className="text-lg font-semibold">The compared models on {fieldRow.name}</h2>
        <div className="bh-table-wrap mt-3 overflow-x-auto" role="region" aria-label="Compared models" tabIndex={0}>
          <table className="bh-table w-full text-sm">
            <thead><tr><th scope="col">Model</th><th scope="col" className="text-right">Result</th><th scope="col">Basis · observed · source</th></tr></thead>
            <tbody>{compared.map((id, j) => {
              const v = valueOf(id), m = models.get(id)!;
              return <tr key={id} aria-current={id === modelId ? 'true' : undefined} className={id === modelId ? 'bg-accent/5' : ''}>
                <th scope="row" className="text-left font-medium">{v != null && id !== modelId ? <Link href={cellHref(fieldRow, id, compared, pinned)} className="hover:underline">{m.display_name}</Link> : m.display_name}{!sameAsName(m) && <span className="bh-muted block text-xs font-normal">{m.org}</span>}</th>
                <td className={`text-right tabular ${win[j] ? 'font-bold' : ''}`}>{v != null ? formatValue(v, fieldRow.unit) : '—'}</td>
                <td className="bh-muted text-xs">{v != null ? <>{basis} · {collected} · <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-accent underline">{host(sourceUrl)} ↗</a></> : 'No published result — never a zero'}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>
      {othersSection}
    </div>;
  }

  const ax = axis!;
  const latest = new Map(latestScores(ax.scores, 'all').filter((r) => r.modelId).map((r) => [r.modelId as string, r]));
  const row = latest.get(modelId);
  if (!row) notFound();
  const win = rowWinners(compared.map((id) => latest.get(id)?.value ?? null), ax.higherBetter ?? null);
  const variant = mergedInto?.bestOf?.variants.find((x) => x.id === axisId);
  // CR-41.2: a run merged into a best-of row keeps its own version on this page.
  const matrixRow = matrix.rows.find((r) => r.id === axisId) ?? (mergedInto && variant ? { ...mergedInto, version: variant.version } : null);
  const bestHere = mergedInto ? cellAxisId(mergedInto, modelId) === axisId : false;
  const direction = ax.higherBetter == null ? 'direction not published' : ax.higherBetter ? 'higher is better' : 'lower is better';

  return <div className="max-w-4xl">
    {backLink}
    <header className="bh-page-head mt-3">
      {/* F-124: a pinned revision is not something to headline — the card below names it once. */}
      <p className="bh-eyebrow">{ax.category}{isPin(ax.version) ? '' : ` · ${humanVersion(ax.version).label}`}{ax.cohort !== 'Published board' ? ` · ${cohortLabel(ax.cohort)}` : ''}</p>
      <h1 className="text-3xl font-bold tracking-tight">{ax.name}</h1>
      {ax.description && <p className="bh-muted mt-2 max-w-2xl">{ax.description}</p>}
    </header>

    <section className="bh-panel p-5" aria-labelledby="bh-result-model">
      <h2 id="bh-result-model" className="bh-muted text-sm">{sameAsName(model) ? '' : `${model.org} · `}<Link href={`/models/${encodeURIComponent(modelId)}`} className="text-accent hover:underline">{model.display_name}</Link></h2>
      <p className="mt-1 text-4xl font-bold tabular" data-bh-result-value>{formatValue(row.value, ax.unit)}</p>
      <p className="bh-muted mt-1 text-sm">Unit: {ax.unit} · {direction}</p>
      {mergedInto && <p className="mt-3 border-t border-line pt-3 text-sm" data-bh-result-best-of>
        This is the {[mergedInto.bestOf?.acrossVersions ? `v${variant?.version}` : null, variant?.cohort].filter(Boolean).join(' · ')} run. The comparison tables merge it into one row, <b>{mergedInto.name}</b> ({mergedInto.cohort}), which shows each model&apos;s best recorded result{bestHere
          ? <> — for {model.display_name} that is this run.</>
          : <> — for {model.display_name} that is the <Link href={cellHref(mergedInto, modelId, compared, pinned)} className="text-accent underline">{variantLabel(mergedInto, modelId)} run</Link>.</>}
      </p>}
      {/* CR-38.2 / CR-38.3: what a reader needs to read this number correctly — the tooltip has room for a
          sentence, this page has room for all of it. Every line is either measured or quoted from the source. */}
      {matrixRow && <ul className="bh-muted mt-3 space-y-1 border-t border-line pt-3 text-sm" data-bh-result-caveats>
        {/* F-100: the eyebrow already says "published <date>" for a snapshot board — the list repeats it only when there is more to say. */}
        {versionLine(matrixRow, true) && !/^Published \d{4}-\d{2}-\d{2}$/.test(versionLine(matrixRow, true)) && <li>{versionLine(matrixRow, true)}</li>}
        {matrixRow.saturation?.saturated && <li><b>Saturated.</b> {matrix.tags.saturated?.tip} Measured here: the {matrixRow.saturation.topN} best of {matrixRow.saturation.models} independently measured models average {Math.round(matrixRow.saturation.share * 1000) / 10}&nbsp;% of this benchmark&apos;s ceiling.</li>}
        {matrixRow.sourceChange && <li data-bh-source-change><b>{matrix.tags.source_changed?.label ?? 'Changed at source'}.</b> {matrixRow.sourceChange.note}</li>}
        {matrixRow.judged && <li><b>Judged.</b> {matrix.tags.judged?.tip} {caveats.judged[matrixRow.key as keyof typeof caveats.judged]?.why}</li>}
        {matrixRow.freshness?.contamination
          ? <li>{matrixRow.freshness.contamination} <span className="opacity-70">(source: &ldquo;{matrixRow.freshness.source?.quote}&rdquo;)</span></li>
          : !matrixRow.freshness?.taskWindow
            /* F-100 (pass 18): when the source states neither, say so once. */
            ? <li>The source states neither a contamination control nor a task or question date window.</li>
            : <li>{matrix.freshnessDefaults.contaminationNote}</li>}
        {!matrixRow.freshness?.taskWindow && matrixRow.freshness?.contamination && <li>{matrix.freshnessDefaults.taskWindowNote}</li>}
      </ul>}
      <div className="mt-4 border-t border-line pt-4"><SourceScore view={view} axis={ax} row={row} /></div>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {ax.url && <a href={ax.url} target="_blank" rel="noreferrer" className="text-accent underline">Benchmark&apos;s primary source ↗</a>}
        <Link href={`/benchmarks?benchmark=${encodeURIComponent(ax.benchmarkId)}`} className="text-accent underline">Every model on this benchmark</Link>
      </p>
    </section>

    <section className="mt-8" aria-labelledby="bh-result-compared">
      <h2 id="bh-result-compared" className="text-lg font-semibold">The compared models on {ax.name}</h2>
      <div className="bh-table-wrap mt-3 overflow-x-auto" role="region" aria-label="Compared models" tabIndex={0}>
        <table className="bh-table w-full text-sm">
          <thead><tr><th scope="col">Model</th><th scope="col" className="text-right">Result</th><th scope="col">Basis · observed · source</th></tr></thead>
          <tbody>{compared.map((id, j) => {
            const r = latest.get(id), m = models.get(id)!, src = r ? view.sources[r.source] : null;
            return <tr key={id} aria-current={id === modelId ? 'true' : undefined} className={id === modelId ? 'bg-accent/5' : ''}>
              <th scope="row" className="text-left font-medium">{r && id !== modelId ? <Link href={resultHref(axisId, id, compared, pinned)} className="hover:underline">{m.display_name}</Link> : m.display_name}{!sameAsName(m) && <span className="bh-muted block text-xs font-normal">{m.org}</span>}</th>
              <td className={`text-right tabular ${win[j] ? 'font-bold' : ''}`}>{r ? formatValue(r.value, ax.unit) : '—'}</td>
              <td className="bh-muted text-xs">{r ? <>{r.basis.replaceAll('_', ' ')} · {r.date?.slice(0, 10) ?? 'date unavailable'}{src ? <> · <a href={src.url} target="_blank" rel="noreferrer" className="text-accent underline">{host(src.url)} ↗</a></> : null}</> : 'No published result — never a zero'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
    {othersSection}
  </div>;
}
