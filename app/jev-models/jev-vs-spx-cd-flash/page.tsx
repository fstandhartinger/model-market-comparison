import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-spx-cd-flash';

export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({
    path: PATH,
    title: 'Jev vs SPX-CD Flash — JevBench by Benchmark Heaven',
    description: 'Compare Jev and SPX-CD Flash using published JevBench measures, scores and measurement conditions.',
    keywords: ['Jev vs SPX-CD Flash', 'SPX-CD Flash benchmark', 'JevBench'],
  });
}

export default function JevVsSpxCdFlashPage() {
  return <JevComparisonPage rivalKey="spx-cd-flash" path={PATH} label="SPX-CD Flash" />;
}
