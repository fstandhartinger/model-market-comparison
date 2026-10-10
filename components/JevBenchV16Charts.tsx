"use client";

import { useCallback, useMemo, useState } from 'react';
import type { ClassCaps } from '../lib/jevbench-class-caps.mjs';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { JEV_V16_CLASS_OPTIONS, JEV_V16_REFERENCE_LABEL, type JevClassOptions } from '../lib/jevbench-jev-class.mjs';
import { JevCapabilityRanking } from './JevCapabilityRanking';
import { JevBubbleCharts } from './JevBubbleChart';
import { JevCapabilityLazy } from './JevCapabilityLazy';
import { jevClassView } from './jevClassView';
import { JevParetoCharts } from './JevParetoCharts';

// PREVIEW ONLY (10 Oct 2026): the Pareto section renders behind this build-time flag and is not rolled out.
const PREVIEW_PARETO = process.env.NEXT_PUBLIC_BH_PREVIEW_PARETO === '1';

type CapView = ClassCaps & { costLimit: number; latencyLimit: number };

/** Keep the capability bars, two flat charts and optional 3D view on one cap selection. */
// Review 6 Oct 2026: reasons on the v1.6 boards print 2.02× (not 2.0×) when a ratio just exceeds the 2× cap.
const BOARD_CLASS_OPTIONS: JevClassOptions = { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true };

export function JevBenchV16Charts({ systems, eligibilitySystems, revision, officialHref, scopeLabel, outsideOpen = false, headline = true }: {
  systems: JevV14System[]; eligibilitySystems: JevV14System[]; revision: string; officialHref: string;
  /** v1.7.1: "open weights" or "API offerings" in the section headings of a split board. */
  scopeLabel?: string; outsideOpen?: boolean; headline?: boolean;
}) {
  // v1.7.5: preliminary/pending API rows appear in the Capability ranking only, not in the scatter or 3D charts.
  const plotted = useMemo(() => systems.filter((s) => s.listing !== 'preliminary' && s.listing !== 'pending'), [systems]);
  const official = useMemo(() => jevClassView(plotted, BOARD_CLASS_OPTIONS), [plotted]);
  const [view, setView] = useState<CapView | null>(null);
  const [show3d, setShow3d] = useState(false);
  const onCapsChange = useCallback((next: CapView) => setView((current) =>
    current && current.costFactor === next.costFactor && current.latencyFactor === next.latencyFactor
      && current.costLimit === next.costLimit && current.latencyLimit === next.latencyLimit ? current : next), []);
  const selected = view ?? { costFactor: 2, latencyFactor: 2, costLimit: official.limits.cost, latencyLimit: official.limits.latency };
  const classOptions = useMemo<JevClassOptions>(() => ({ ...BOARD_CLASS_OPTIONS, costFactor: selected.costFactor, latencyFactor: selected.latencyFactor }), [selected.costFactor, selected.latencyFactor]);
  const current = useMemo(() => jevClassView(plotted, classOptions), [plotted, classOptions]);

  return <>
    <JevCapabilityRanking systems={systems} eligibilitySystems={eligibilitySystems} revision={revision} officialHref={officialHref} onCapsChange={onCapsChange} referenceLabel={JEV_V16_REFERENCE_LABEL} limits={JEV_V16_CLASS_OPTIONS.limits} nearCapPrecision scopeLabel={scopeLabel} outsideOpen={outsideOpen} headline={headline} />
    <JevBubbleCharts points={current.points} costLimit={selected.costLimit} latencyCap={selected.latencyLimit} costFactor={selected.costFactor} latencyFactor={selected.latencyFactor} referenceName={JEV_V16_REFERENCE_LABEL} scoreKind="v15" scopeLabel={scopeLabel} />
    {PREVIEW_PARETO && <JevParetoCharts points={current.points} costLimit={selected.costLimit} latencyLimit={selected.latencyLimit} scopeLabel={scopeLabel} />}
    <section className="mt-8 scroll-mt-6" data-bh-jev16-3d-toggle>
      <button type="button" className="text-accent underline" aria-expanded={show3d} aria-controls={show3d ? 'jev16-capability-3d' : undefined} onClick={() => setShow3d((open) => !open)}>{show3d ? 'Hide 3D view' : 'Show 3D view'}</button>
      {show3d && <div id="jev16-capability-3d"><JevCapabilityLazy revision={revision} systems={plotted} only3d classOptions={classOptions} /></div>}
    </section>
  </>;
}
