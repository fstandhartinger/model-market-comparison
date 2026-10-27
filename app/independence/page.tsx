import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { USE_MODEL_PUBLIC } from '../../lib/use-model';

export const metadata: Metadata = {
  title: 'How Benchmark Heaven stays independent',
  description: 'Our relationship with Decision Models, how run-it-yourself links work, and how authors can opt out.',
  robots: { index: false },
};

export default function IndependencePage() {
  if (!USE_MODEL_PUBLIC) notFound();

  return <article className="max-w-3xl text-[15px] leading-relaxed">
    <header className="bh-page-head">
      <h1 className="text-3xl font-bold tracking-tight">How Benchmark Heaven stays independent</h1>
      <p className="bh-muted mt-3">Running a benchmark alongside a commercial service creates a conflict of interest. Here is the relationship and how we keep the link separate from the results.</p>
    </header>
    <section className="mt-7">
      <h2 className="text-xl font-semibold">Who runs these sites</h2>
      <p className="mt-3">Decision Models is run by the same company as Benchmark Heaven: productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG, the one-person company identified on our <a className="text-accent underline" href="/about#support">About page</a>. Decision Models offers commercial ways to run models. A link to it is a link to our own service.</p>
    </section>
    <section className="mt-7">
      <h2 className="text-xl font-semibold">What “Run it yourself” does</h2>
      <p className="mt-3">Every eligible open-weights row gets the same link, whether or not Decision Models serves the model. It opens a model page with four routes: dedicated hosting, a hosted API where available, local installation, and a request for pre-installed hardware. Availability and licence restrictions still apply; a request is not a promise of service.</p>
      <p className="mt-3">Where the author offers their own API or weights, the model page links to those too. Hosted API rows, wrappers and reference entries do not get this link. A row needs a mapped model page, and authors can opt out.</p>
    </section>
    <section className="mt-7">
      <h2 className="text-xl font-semibold">What the link never changes</h2>
      <p className="mt-3">The link never changes scores, ranks, inclusion in the benchmark or the order of rows. Click data is never used for ranking. Removing the link leaves the measurement and its position unchanged. Our private in-house models are excluded from public JevBench releases by the release validation rules.</p>
    </section>
    <section className="mt-7">
      <h2 className="text-xl font-semibold">Check the method and data</h2>
      <p className="mt-3">Read the <a className="text-accent underline" href="/jev-models/methodology">JevBench methodology</a> and <a className="text-accent underline" href="/jev-models/data">public results and data card</a> for scoring, versions, model pins and limitations. Published system-level results are downloadable; sealed questions and per-item predictions remain private.</p>
    </section>
    <section className="mt-7">
      <h2 className="text-xl font-semibold">For model authors</h2>
      <p className="mt-3">You can ask us to remove the Decision Models link from your row. Email <a className="text-accent underline" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a> with the model name and benchmark. We record link opt-outs separately from benchmark results; opting out does not affect your score or eligibility.</p>
    </section>
  </article>;
}
