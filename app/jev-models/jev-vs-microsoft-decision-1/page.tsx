import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-microsoft-decision-1';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Microsoft-Decision-1 vs Jev — JevBench by Benchmark Heaven', description: 'Published JevBench measures for Microsoft-Decision-1 (Azure Foundry) and Jev: intelligence, calibration, speed, cost, with method version, dates and list prices.', keywords: ['microsoft decision 1 vs jev', 'microsoft decision 1 api', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsMicrosoftDecision1Page() {
  return <JevComparisonPage rivalKey="microsoft-decision-1" path={PATH} label="Microsoft-Decision-1" priceNotes={[
    'Microsoft-Decision-1 (Azure Foundry): USD 0.042 per 1M input tokens, output free. Source: Microsoft announcement of 9 Oct 2026 and the OpenRouter listing.',
    'Jev (TypeSafe AI): USD 0.042 per 1M input tokens, output free. Source: docs.typesafe.ai/models, fetched 16 Oct 2026.',
  ]} />;
}
