import type { Metadata } from 'next';
import MultimodalPreviewPage from '../../jev-models/multimodal-preview/page';

// Unlisted work-in-progress preview for Florian (23 Sep 2026). Not linked, not indexed.
export const metadata: Metadata = {
  title: 'WORK IN PROGRESS — ImageJevBench preview',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function WipImageJevPreview() {
  return <>
    <div className="mb-6 rounded-xl border-4 border-red-600 bg-red-50 px-5 py-4 text-red-900 dark:bg-red-950 dark:text-red-100" role="note" data-bh-wip-banner>
      <p className="text-2xl font-black tracking-wide">WORK IN PROGRESS</p>
      <p className="mt-1 text-sm">Unreleased ImageJevBench v0.1 candidate. Numbers, method and layout may still change. Please don't share.</p>
    </div>
    <MultimodalPreviewPage />
  </>;
}
