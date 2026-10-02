"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { JevClassOptions } from '../lib/jevbench-jev-class.mjs';
import type { JevV14System } from '../lib/jevbench-v14.mjs';

const JevCapabilityChart = dynamic(
  () => import('./JevCapabilityChart').then((module) => module.JevCapabilityChart),
  { ssr: false },
);

export function JevCapabilityLazy({ revision, only3d = false, systems: suppliedSystems, classOptions, benchName }: { revision: string; only3d?: boolean; systems?: JevV14System[]; classOptions?: JevClassOptions; benchName?: string }) {
  const [systems, setSystems] = useState<JevV14System[] | null>(suppliedSystems ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (suppliedSystems) { setSystems(suppliedSystems); return; }
    let active = true;
    fetch(`/api/jevbench/${revision}`, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`JevBench API returned ${response.status}`);
        return response.json() as Promise<{ systems?: JevV14System[] }>;
      })
      .then((data) => {
        if (!active) return;
        const available = data.systems ?? [];
        setSystems(['v1.5.1', 'v1.5.2', 'v1.5.3', 'v1.5.4', 'v1.5.5'].includes(revision) ? available.filter((row) => row.ranked) : available);
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [revision, suppliedSystems]);

  if (error) return <p className="bh-muted mt-12 text-sm" role="alert">Capability views are unavailable right now.</p>;
  if (!systems) return <p className="bh-muted mt-12 text-sm" role="status">Loading capability views…</p>;
  return <JevCapabilityChart systems={systems} revision={revision} only3d={only3d} classOptions={classOptions} benchName={benchName} />;
}
