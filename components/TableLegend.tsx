"use client";
import Link from "next/link";
import { Fragment } from "react";
import type { BenchmarkMatrix as Matrix } from "../lib/benchmark-matrix.mjs";

/** F-122 (Fable pass 23): every benchmark table's footnote is two sentences; everything a mark or a
 *  tag means lives one click away, in a collapsed legend. The tag lines are generated from the tag
 *  set, so a new tag (Retired, Changed at source, …) arrives with its own line and nobody has to
 *  remember to extend a paragraph. The `title` a tag pill carries is unreachable on a phone — this
 *  legend is the only place a touch reader can decode it. */

export const CATEGORY_ROW_NOTE =
  "Category rows average the shown 0–100 results every compared model has — at least two; saturated benchmarks weigh half; judged, Elo, native index and cost rows are left out.";

/** Kept verbatim — `test/cr-60-union-alpha-preliminary.test.mjs` pins both halves (CR-60.2 / F-121). */
export const PRELIMINARY_NOTE =
  "‡ marks a preliminary, announced value (for example read from a chart in a launch post): it is shown only and never enters a score or a ranking.";

function Row({ id, term, children }: { id: string; term: React.ReactNode; children: React.ReactNode }) {
  return <><dt data-bh-legend-entry={id}>{term}</dt><dd>{children}</dd></>;
}

/**
 * @param tags     the matrix tag set — one legend line per key in `tagKeys`
 * @param tagKeys  which tags this table can actually show (all of them in the full comparison,
 *                 the caveat tags in Simple)
 * @param outliers Simple's `top` / `low` tags
 * @param scoreRow what the table's own score row(s) at the top are
 */
export function TableLegend({ tags, tagKeys, outliers = false, scoreRow = null }: { tags: Matrix["tags"]; tagKeys: string[]; outliers?: boolean; scoreRow?: React.ReactNode }) {
  return <details className="bh-legend mt-1" data-bh-legend data-bh-table-legend>
    <summary className="cursor-pointer select-none text-gray-400 hover:text-inherit">Legend: marks and tags</summary>
    <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
      <Row id="best-of" term={<b className="whitespace-nowrap">best of</b>}>Each model&apos;s best recorded result across agents (Claude Code, Codex) and, for the AA Coding Agent Index, versions.</Row>
      <Row id="self-reported" term={<span aria-hidden="true">†</span>}>A developer&apos;s own report, not an independent measurement.</Row>
      <Row id="preliminary" term={<span aria-hidden="true">‡</span>}>{PRELIMINARY_NOTE}</Row>
      <Row id="missing" term={<span aria-hidden="true">—</span>}>No published result — never a zero.</Row>
      {outliers && <Row id="outlier" term={<span className="whitespace-nowrap"><span className="bh-outlier-tag" data-kind="top">top</span> <span className="bh-outlier-tag" data-kind="low">low</span></span>}>The gap to the next model is at least twice the spread of the models in between.</Row>}
      {tagKeys.map((k) => tags[k] && <Fragment key={k}><dt data-bh-legend-entry={k} data-bh-tag-legend={k}><span className="bh-matrix-tag" data-tag={k} data-bh-legend-sample>{tags[k].label}</span></dt><dd>{tags[k].tip}</dd></Fragment>)}
      {scoreRow && <><dt className="sr-only">Score rows</dt><dd className="col-start-2" data-bh-legend-entry="score-row">{scoreRow}</dd></>}
      <dt className="sr-only">Category rows</dt><dd className="col-start-2" data-bh-legend-entry="category">{CATEGORY_ROW_NOTE}</dd>
    </dl>
    <p className="mt-2"><Link href="/about#benchmark-tags" className="underline">How the tags are decided</Link>.</p>
  </details>;
}

/** The Compare table speaks native units and percentiles, not bars and category rows. */
export function CompareLegend() {
  return <details className="bh-legend mt-1" data-bh-legend data-bh-table-legend>
    <summary className="cursor-pointer select-none text-gray-400 hover:text-inherit">Legend: marks and tags</summary>
    <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
      <Row id="best-of-variants" term={<span className="whitespace-nowrap">best of variants</span>}>The model&apos;s best measured reasoning variant on that benchmark; the variant is named beside it.</Row>
      <Row id="preliminary" term={<span aria-hidden="true">‡</span>}>{PRELIMINARY_NOTE} Here it also earns no percentile and no tint.</Row>
      <Row id="percentile" term={<span className="inline-block h-1 w-7 overflow-hidden rounded-full bg-[rgb(var(--line)/.5)] align-middle" aria-hidden="true"><span className="block h-full w-2/3 rounded-full bg-accent" /></span>}>The value&apos;s percentile among every model we hold for that benchmark — not among the compared models.</Row>
      <Row id="significance" term={<span className="whitespace-nowrap">tinted cell</span>}>The best measured relative position in that row; small differences are not evidence of significance.</Row>
      <Row id="priority" term={<span className="whitespace-nowrap">which value</span>}>Measured results take priority over vendor claims, then the latest observation.</Row>
    </dl>
    <p className="mt-2"><Link href="/about#benchmark-tags" className="underline">How the tags are decided</Link>.</p>
  </details>;
}
