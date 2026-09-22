import type { Metadata } from 'next';
import { ComparePricePanel } from '../../components/ComparePricePanel';
import { BenchmarkCompareLoader } from '../../components/deferred/BenchmarkCompareLoader';
import { pageDataVersion } from '../../lib/page-data';
import { previewMetadata, SHARE_IMAGE } from "../../lib/seo";
import { compareDescription, compareHeadline, resolveCompareRequest } from "../../lib/compare-meta";

const BASE = { path: "/compare", documentTitle: "Compare", title: "Compare AI models — Benchmark Heaven",
  description: "Up to four models, every benchmark, the evidence beside each score — plus what each model actually costs per task." };

// CR-122 (launch links, Florian 2026-09-22): a compare link is posted under a release announcement within
// seconds, so its preview must name both models — including one that is not in the data yet. That means the
// page reads `searchParams` on the server, which makes it dynamic by definition (see test/production/prerender.mjs).
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const request = await resolveCompareRequest(await searchParams);
  if (!request.entries.length) return previewMetadata(BASE);
  const headline = compareHeadline(request.entries);
  const description = compareDescription(request.entries);
  const meta = previewMetadata({ path: request.path, documentTitle: `${headline} — compare`, title: `${headline} — Benchmark Heaven`, description });
  const image = { url: `/api/og/compare?${request.query}`, width: SHARE_IMAGE.width, height: SHARE_IMAGE.height, alt: `${headline} — Benchmark Heaven comparison` };
  return { ...meta, openGraph: { ...meta.openGraph, images: [image] }, twitter: { ...meta.twitter, images: [image.url] } };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // CR-14.1's data-derived default pair is chosen in lib/page-data.ts (CR-62.1: fetched after the shell).
  const request = await resolveCompareRequest(await searchParams);
  const headline = request.entries.length ? compareHeadline(request.entries) : null;
  return (
    <div>
      <header className="bh-page-head">
        <h1 className="text-3xl font-bold tracking-tight">{headline ?? 'Compare'}</h1>
        <p className="bh-muted mt-3 max-w-2xl">Up to four models, every benchmark, the evidence beside each score.{request.pending.length
          ? ` ${request.pending.map((p) => p.name).join(' and ')} ${request.pending.length === 1 ? 'is' : 'are'} not measured yet — the numbers land here as soon as they are published.`
          : ''}</p>
      </header>
      <BenchmarkCompareLoader version={await pageDataVersion()} />
      <ComparePricePanel />
    </div>
  );
}
