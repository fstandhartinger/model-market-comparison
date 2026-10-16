"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ContextData, JevContextBoard } from './JevContextLength';

const JevContextLength = dynamic(
  () => import('./JevContextLength').then((module) => module.JevContextLength),
  { ssr: false },
);

/** Archived release pages (no `board`) keep the frozen v1.4.1 dataset; live boards load the current-draw dataset. */
export function JevContextLazy({ board }: { board?: JevContextBoard } = {}) {
  const [data, setData] = useState<ContextData | null>(null);
  const live = board != null;
  useEffect(() => {
    let active = true;
    (live ? import('../data/jevbench-context-length-board.json') : import('../data/jevbench-context-length.json'))
      .then((module) => { if (active) setData(module.default as ContextData); });
    return () => { active = false; };
  }, [live]);
  if (!data) return <p className="bh-muted mt-12 text-sm" role="status">Loading context-length views…</p>;
  return <JevContextLength data={data} board={board} />;
}
