import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-openai-decisions-api';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'OpenAI Decisions API vs Jev — JevBench by Benchmark Heaven', description: 'Published JevBench measures for the OpenAI Decisions API (gpt-6-luna) and Jev: intelligence, calibration, speed, cost, with method version, dates and list prices.', keywords: ['openai decisions api vs jev', 'openai decisions api pricing', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsOpenAiDecisionsPage() {
  return <JevComparisonPage rivalKey="openai-decisions" path={PATH} label="OpenAI Decisions API" priceNotes={[
    'OpenAI Decisions API (POST /v1/decisions, gpt-6-luna): USD 0.10 per 1M uncached input tokens, no output charge. Source: developers.openai.com/api/docs/guides/decisions, checked 25 Oct 2026.',
    'Jev (TypeSafe AI): USD 0.042 per 1M input tokens, output free. Source: docs.typesafe.ai/models, fetched 16 Oct 2026.',
  ]} />;
}
