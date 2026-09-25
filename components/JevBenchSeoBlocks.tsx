import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE_URL } from '../lib/seo';

type Faq = { question: string; answer: string };
type Artifact = {
  revision: string;
  generated_utc: string;
  protocol: string;
  score_one_liner: string;
};

export type SeoRow = {
  key: string;
  display: string;
  rank: number;
  jevbench_score: number;
  sealed_accuracy: number;
  public_accuracy?: number;
  public_minus_sealed_gap_pp?: number;
  axes: { intelligence: number; calibration: number; speed: number; cost: number };
  cost?: { kind?: string; usd_per_1000?: number | null };
  speed?: { p50_s_adjusted?: number | null; p95_s_adjusted?: number | null; adjustment?: string };
  endpoint_condition?: string;
  open?: string | boolean | null;
  licence?: string | null;
  repo?: string | null;
};

export function one(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(1);
}

export function percent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : `${(value * 100).toFixed(1)}%`;
}

export function usdPerThousand(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'not published';
  return `$${value.toFixed(value < 0.01 ? 4 : 3)} per 1,000 decisions`;
}

export function costBasisLabel(kind: string | null | undefined): string {
  if (kind === 'measured') return 'measured';
  if (kind === 'estimate') return 'estimated';
  if (kind === 'announced') return 'announced price';
  return 'not published';
}

export function opennessLabel(row: SeoRow): string {
  if (row.open === 'yes' || row.open === true) return 'Code and weights marked open in the published row';
  if (row.open === 'weights') return 'Weights marked open in the published row';
  if (row.open === 'no') return 'Marked closed in the published row';
  return 'Unknown in the published row';
}

export function DatasetFaqJsonLd({ path, artifact, faq }: { path: string; artifact: Artifact; faq: Faq[] }) {
  const canonical = new URL(path, SITE_URL).toString();
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        '@id': `${canonical}#dataset`,
        name: `JevBench ${artifact.revision} public aggregate — Benchmark Heaven`,
        description: 'Published aggregate benchmark results for Jev-class decision models, with separate intelligence, calibration, speed and cost measures.',
        url: canonical,
        creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: SITE_URL },
        isAccessibleForFree: true,
        dateModified: artifact.generated_utc,
        version: artifact.revision,
        measurementTechnique: artifact.score_one_liner,
        variableMeasured: ['JevBench Score', 'Intelligence', 'Calibration', 'Speed', 'Cost', 'sealed accuracy'],
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `${SITE_URL}/api/jevbench/v1.4.2`,
        },
        citation: 'https://github.com/fstandhartinger/jevbench/blob/v1.4.2/docs/METHOD-v1.4.md',
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }} />;
}

export function JevFaq({ items }: { items: Faq[] }) {
  return (
    <section className="bh-panel mt-8 p-5" aria-labelledby="jev-intent-faq">
      <h2 id="jev-intent-faq" className="text-xl font-semibold">Frequently asked questions</h2>
      <dl className="mt-3 space-y-4">
        {items.map(({ question, answer }) => (
          <div key={question}>
            <dt className="font-semibold">{question}</dt>
            <dd className="bh-muted mt-1">{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function JevIntentLinks({ current }: { current: 'alternatives' | 'chooser' }) {
  const sibling = current === 'alternatives'
    ? { href: '/jev-models/how-to-choose', label: 'How to choose a Jev-class model' }
    : { href: '/jev-models/alternatives', label: 'Jev alternatives' };
  return (
    <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="JevBench guides" data-bh-jev-guides={current}>
      <Link className="text-accent underline" href="/jev-models">Live JevBench board</Link>
      <Link className="text-accent underline" href={sibling.href}>{sibling.label}</Link>
      <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench">JevBench method and repository</a>
    </nav>
  );
}

export function JevBoardIntentLinks() {
  return <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="JevBench decision guides" data-bh-jev-board-guides>
    <Link className="text-accent underline" href="/jev-models/alternatives">Compare Jev alternatives</Link>
    <Link className="text-accent underline" href="/jev-models/how-to-choose">Choose a Jev-class model by use case</Link>
  </p>;
}

export function JevRowLink({ row, children }: { row: SeoRow; children?: ReactNode }) {
  return <Link className="text-accent underline" href={`/jev-models#jev14-row-${encodeURIComponent(row.key)}`}>{children ?? row.display}</Link>;
}
