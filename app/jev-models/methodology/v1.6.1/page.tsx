import { previewMetadata } from '../../../../lib/seo';
import { DecisionMethodology, GUIDE_REVIEWED } from '../../../../components/DecisionBenchmarkGuide';
import { PageJsonLd } from '../../../../components/PageJsonLd';
export const metadata = previewMetadata({ path: '/jev-models/methodology/v1.6.1', title: 'JevBench v1.6.1 methodology — decision models', documentTitle: 'JevBench v1.6.1 methodology — decision models', description: 'The JevBench v1.6.1 method: Capability, gated harmonic Composite, dataset scope, release hashes and reproducibility limits.' });
export default function VersionedMethodologyPage() { return <><DecisionMethodology version="v1.6.1" /><PageJsonLd meta={metadata} article={{ dateModified: GUIDE_REVIEWED }} /></>; }
