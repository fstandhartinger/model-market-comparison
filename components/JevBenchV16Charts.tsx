"use client";

import { useCallback, useMemo, useState } from 'react';
import type { ClassCaps } from '../lib/jevbench-class-caps.mjs';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { JEV_V16_CLASS_OPTIONS, JEV_V16_REFERENCE_LABEL, type JevClassOptions } from '../lib/jevbench-jev-class.mjs';
import { JevCapabilityRanking } from './JevCapabilityRanking';
import { JevBubbleCharts } from './JevBubbleChart';
import { JevCapabilityLazy } from './JevCapabilityLazy';
import { jevClassView } from './jevClassView';

type CapView = ClassCaps & { costLimit: number; latencyLimit: number };

/** Keep the capability bars, two flat charts and optional 3D view on one cap selection. */
export function JevBenchV16Charts({ systems, eligibilitySystems, revision, officialHref }: {
  systems: JevV14System[]; eligibilitySystems: JevV14System[]; revision: string; officialHref: string;
}) {
  const official = useMemo(() => jevClassView(systems, JEV_V16_CLASS_OPTIONS), [systems]);
  const [view, setView] = useState<CapView | null>(null);
  const [show3d, setShow3d] = useState(false);
  const onCapsChange = useCallback((next: CapView) => setView((current) =>
    current && current.costFactor === next.costFactor && current.latencyFactor === next.latencyFactor
      && current.costLimit === next.costLimit && current.latencyLimit === next.latencyLimit ? current : next), []);
  const selected = view ?? { costFactor: 2, latencyFactor: 2, costLimit: official.limits.cost, latencyLimit: official.limits.latency };
  const classOptions = useMemo<JevClassOptions>(() => ({ ...JEV_V16_CLASS_OPTIONS, costFactor: selected.costFactor, latencyFactor: selected.latencyFactor }), [selected.costFactor, selected.latencyFactor]);
  const current = useMemo(() => jevClassView(systems, classOptions), [systems, classOptions]);

  return <>
    <JevCapabilityRanking systems={systems} eligibilitySystems={eligibilitySystems} revision={revision} officialHref={officialHref} onCapsChange={onCapsChange} referenceLabel={JEV_V16_REFERENCE_LABEL} limits={JEV_V16_CLASS_OPTIONS.limits} />
    <JevBubbleCharts points={current.points} costLimit={selected.costLimit} latencyCap={selected.latencyLimit} referenceName={JEV_V16_REFERENCE_LABEL} scoreKind="v15" />
    <section className="mt-8 scroll-mt-6" data-bh-jev16-3d-toggle>
      <button type="button" className="text-accent underline" aria-expanded={show3d} aria-controls="jev16-capability-3d" onClick={() => setShow3d((open) => !open)}>{show3d ? 'Hide 3D view' : 'Show 3D view'}</button>
      {show3d && <div id="jev16-capability-3d"><JevCapabilityLazy revision={revision} systems={systems} only3d classOptions={classOptions} /></div>}
    </section>
  </>;
}
