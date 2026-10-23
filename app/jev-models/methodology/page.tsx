import { previewMetadata } from '../../../lib/seo';
import { DecisionMethodology, GUIDE_REVIEWED } from '../../../components/DecisionBenchmarkGuide';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = previewMetadata({ path: '/jev-models/methodology', title: 'Decision model benchmark methodology — JevBench', documentTitle: 'JevBench methodology: decision model benchmark', description: 'How JevBench measures typed decision accuracy, calibration, latency and cost. Versioned scoring, model pins, reproducibility and limitations.' });
export default function MethodologyPage() { return <><DecisionMethodology /><PageJsonLd meta={metadata} article={{ dateModified: GUIDE_REVIEWED }} /></>; }
