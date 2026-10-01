import { baseModelFor, isBaseModelDisclosed, type BaseModelBenchmark } from '../lib/jev-base-model.mjs';

// CR-254 (2026-10-01): the cited "Base model" display shared by every JevBench and ImageJevBench row and
// model detail page. It is presentation only — it reads the separate base-model metadata overlay and
// never touches a score, rank, artifact, price or the scorer. A missing key (or a disclosed entry with
// no usable source/label) renders "undisclosed"; it never infers a base model.
//
// No "use client" directive and no fs access, so both the server pages and the client board components
// can render it. The resolver is a static JSON import.

export type { BaseModelBenchmark } from '../lib/jev-base-model.mjs';

export function BaseModelDisplay({ benchmark = 'jevbench', systemKey, prefix = 'Base model', className = '' }: {
  benchmark?: BaseModelBenchmark;
  systemKey: string;
  prefix?: string;
  className?: string;
}) {
  const entry = baseModelFor(benchmark, systemKey);
  const disclosed = isBaseModelDisclosed(entry);
  // Keep the routine unknown note in the title; explicit author/row notes remain visible.
  const showNote = entry.note && (disclosed || entry.note !== 'No verified public base-model disclosure recorded.');
  return <span className={className} data-bh-base-model={systemKey} data-bh-base-model-benchmark={benchmark} data-bh-base-model-status={entry.status}>
    {prefix && <><span className="bh-muted">{prefix}:</span>{' '}</>}
    <span data-bh-base-model-label title={!showNote ? entry.note ?? undefined : undefined}>{entry.label}</span>
    {entry.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer"
      className="ml-1 text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current"
      title={source.evidence || source.title || source.url} aria-label={`${prefix || 'Base model'} source ${index + 1} for ${systemKey}`}
      data-bh-base-model-source={index}>{entry.sources.length > 1 ? `source ${index + 1}` : 'source'}</a>)}
    {showNote && <span className="bh-muted"> · {entry.note}</span>}
  </span>;
}
