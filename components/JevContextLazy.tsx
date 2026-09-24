"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ContextData } from './JevContextLength';

const JevContextLength = dynamic(
  () => import('./JevContextLength').then((module) => module.JevContextLength),
  { ssr: false },
);

export function JevContextLazy() {
  const [data, setData] = useState<ContextData | null>(null);
  useEffect(() => {
    let active = true;
    import('../data/jevbench-context-length.json')
      .then((module) => { if (active) setData(module.default as ContextData); });
    return () => { active = false; };
  }, []);
  if (!data) return <p className="bh-muted mt-12 text-sm" role="status">Loading context-length views…</p>;
  return <JevContextLength data={data} />;
}
