import { baseModelFor, isBaseModelDisclosed, type BaseModelBenchmark, type BaseModelFootnote } from '../lib/jev-base-model.mjs';

// CR-254 (2026-10-01): the cited "Base model" display shared by every JevBench and ImageJevBench row and
// model detail page. It is presentation only — it reads the separate base-model metadata overlay and
// never touches a score, rank, artifact, price or the scorer. A missing key (or a disclosed entry with
// no usable source/label) renders "undisclosed"; it never infers a base model.
//
// No "use client" directive and no fs access, so both the server pages and the client board components
// can render it. The resolver is a static JSON import.

export type { BaseModelBenchmark } from '../lib/jev-base-model.mjs';

/** Anchor id of a row's base-model footnote under a ranking (see baseModelFootnotes). */
export const baseModelNoteId = (benchmark: string, systemKey: string) => `bh-base-note-${benchmark}-${systemKey}`;

export function BaseModelDisplay({ benchmark = 'jevbench', systemKey, prefix = 'Base model', className = '', footnote }: {
  benchmark?: BaseModelBenchmark;
  systemKey: string;
  prefix?: string;
  className?: string;
  /** v1.7.1: when set, the provenance note is replaced by a "*n" link to footnote n under the ranking. */
  footnote?: number;
}) {
  const entry = baseModelFor(benchmark, systemKey);
  // Keep the routine unknown note in the title; explicit author/row notes remain visible (same rule as baseModelVisibleNote).
  const showNote = !!entry.note && (isBaseModelDisclosed(entry) || entry.note !== 'No verified public base-model disclosure recorded.');
  return <span className={className} data-bh-base-model={systemKey} data-bh-base-model-benchmark={benchmark} data-bh-base-model-status={entry.status}>
    {prefix && <><span className="bh-muted">{prefix}:</span>{' '}</>}
    <span data-bh-base-model-label title={!showNote ? entry.note ?? undefined : undefined}>{entry.label}</span>
    {entry.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer"
      className="ml-1 text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current"
      title={source.evidence || source.title || source.url} aria-label={`${prefix || 'Base model'} source ${index + 1} for ${systemKey}`}
      data-bh-base-model-source={index}>{entry.sources.length > 1 ? `source ${index + 1}` : 'source'}</a>)}
    {showNote && footnote != null && <a href={`#${baseModelNoteId(benchmark, systemKey)}`} className="text-accent no-underline" title={entry.note ?? undefined}
      aria-label={`Base-model note ${footnote} for ${systemKey}`} data-bh-base-model-footnote-ref={footnote}>*<sup>{footnote}</sup></a>}
    {showNote && footnote == null && <span className="bh-muted"> · {entry.note}</span>}
  </span>;
}

/** v1.7.1: the numbered base-model notes under a ranking whose rows link to them with "*n". */
export function BaseModelFootnotes({ benchmark = 'jevbench', notes, names }: {
  benchmark?: BaseModelBenchmark;
  notes: BaseModelFootnote[];
  names: ReadonlyMap<string, string>;
}) {
  if (notes.length === 0) return null;
  return <div className="mt-3 border-t border-line pt-2" data-bh-base-model-footnotes={benchmark}>
    <p className="bh-muted text-[11.5px] font-semibold">Base-model notes</p>
    <ol className="bh-muted mt-1 space-y-1 text-[11.5px] leading-snug">
      {notes.map((f) => <li key={f.key} id={baseModelNoteId(benchmark, f.key)} className="scroll-mt-6" data-bh-base-model-footnote={f.key}>
        <span className="tabular">*{f.n}</span> <b className="font-semibold">{names.get(f.key) ?? f.key}</b> (base model: {f.label}): {f.note}
      </li>)}
    </ol>
  </div>;
}
