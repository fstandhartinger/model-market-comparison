import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-laya';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs Laya — JevBench by Benchmark Heaven', description: 'Compare Jev and Laya using published JevBench measures for intelligence, calibration, speed, cost, openness and measurement setup.', keywords: ['jev vs laya', 'Laya benchmark', 'Laya model', 'Convai Laya', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsLayaPage() {
  return <JevComparisonPage rivalKey="laya" path={PATH} label="Laya" />;
}
