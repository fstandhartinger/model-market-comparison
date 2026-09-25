"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { JevV14System } from '../lib/jevbench-v14.mjs';

const JevCapabilityChart = dynamic(
  () => import('./JevCapabilityChart').then((module) => module.JevCapabilityChart),
  { ssr: false },
);

export function JevCapabilityLazy({ revision, only3d = false }: { revision: string; only3d?: boolean }) {
  const [systems, setSystems] = useState<JevV14System[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/jevbench/${revision}`, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`JevBench API returned ${response.status}`);
        return response.json() as Promise<{ systems?: JevV14System[] }>;
      })
      .then((data) => { if (active) setSystems(data.systems ?? []); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [revision]);

  if (error) return <p className="bh-muted mt-12 text-sm" role="alert">Capability views are unavailable right now.</p>;
  if (!systems) return <p className="bh-muted mt-12 text-sm" role="status">Loading capability views…</p>;
  return <JevCapabilityChart systems={systems} revision={revision} only3d={only3d} />;
}
