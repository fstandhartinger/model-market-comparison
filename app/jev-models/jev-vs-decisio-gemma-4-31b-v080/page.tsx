import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-decisio-gemma-4-31b-v080';

export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({
    path: PATH,
    title: 'Jev vs decisio Gemma 4 31B v0.8.0 — JevBench by Benchmark Heaven',
    description: 'Compare Jev and decisio Gemma 4 31B v0.8.0 using published JevBench measures, scores and measurement conditions.',
    keywords: ['Jev vs decisio Gemma 4 31B', 'decisio Gemma 4 benchmark', 'JevBench'],
  });
}

export default function JevVsDecisioGemma431BV080Page() {
  return <JevComparisonPage rivalKey="decisio-gemma-4-31b-v080" path={PATH} label="decisio v0.8.0 on gemma-4-31B-it" />;
}
