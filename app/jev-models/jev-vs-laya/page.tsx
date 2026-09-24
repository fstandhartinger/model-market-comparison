import type { Metadata } from 'next';
import { JevVsLayaComparisonPage } from '../../../components/JevVsLayaComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-laya';

export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({
    path: PATH,
    title: 'Jev vs Laya: benchmark score, cost, and hardware | JevBench',
    description: 'Compare measured Jev and Laya results in the public JevBench v1.4.1 release, with separate score axes, measured and estimated cost, model, license, and run setup.',
    keywords: ['jev vs laya', 'laya benchmark', 'JevBench Laya', 'Laya model cost', 'Jev benchmark comparison'],
  });
}

export default function JevVsLayaPage() {
  return <JevVsLayaComparisonPage path={PATH} />;
}
