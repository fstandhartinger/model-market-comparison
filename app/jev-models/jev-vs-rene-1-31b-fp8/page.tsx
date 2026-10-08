import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-rene-1-31b-fp8';

export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({
    path: PATH,
    title: 'Jev vs René-1 31B FP8 — JevBench by Benchmark Heaven',
    description: 'Compare Jev and René-1 31B FP8 using published JevBench measures, scores and measurement conditions.',
    keywords: ['Jev vs René-1', 'René-1 31B benchmark', 'JevBench'],
  });
}

export default function JevVsRene131BFP8Page() {
  return <JevComparisonPage rivalKey="rene-1-31b-fp8" path={PATH} label="René-1 31B FP8" />;
}
