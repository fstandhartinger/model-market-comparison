import type { Metadata } from "next";
import { previewMetadata } from "../../../lib/seo";

export const metadata: Metadata = previewMetadata({
  path: "/jev-models/custom-evaluation",
  documentTitle: "Custom Jev-class model evaluation",
  title: "Custom Jev-class model evaluation | Benchmark Heaven",
  description: "We evaluate Jev-class systems on your own labelled dataset and report accuracy, calibration, latency and cost.",
});

const contact = "mailto:florian.standhartinger@gmail.com?subject=Custom%20Jev-class%20model%20evaluation";

export default function CustomEvaluationPage() {
  return <article className="max-w-3xl text-[15px] leading-relaxed">
    <header className="bh-page-head">
      <p className="bh-eyebrow">JevBench · custom work</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Find the Jev-class model that fits your data</h1>
      <p className="bh-muted mt-3 max-w-2xl text-lg">We run the JevBench entrants on your own labelled dataset and compare the trade-offs that matter in your use case.</p>
    </header>

    <section className="mt-8" aria-labelledby="custom-what">
      <h2 id="custom-what" className="text-xl font-semibold">What we do</h2>
      <p className="bh-muted mt-2">We run every entrant on your labelled dataset, report accuracy, calibration, latency and cost for each system, and recommend the best fit for your requirements.</p>
    </section>

    <section className="mt-7" aria-labelledby="custom-need">
      <h2 id="custom-need" className="text-xl font-semibold">What we need</h2>
      <p className="bh-muted mt-2">A labelled sample, a clear task definition, and your expected volume and latency requirements. We use your data only for your evaluation, do not publish it, and delete it on request.</p>
    </section>

    <section className="mt-7" aria-labelledby="custom-get">
      <h2 id="custom-get" className="text-xl font-semibold">What you get</h2>
      <p className="bh-muted mt-2">A written report with our recommendation and the raw results, so you can inspect every system and make your own decision.</p>
    </section>

    <section className="mt-7" aria-labelledby="custom-price">
      <h2 id="custom-price" className="text-xl font-semibold">Price and contact</h2>
      <p className="mt-2"><b>Flat fee: $1,000 per evaluation.</b> Unusually large or complex work gets an individual quote.</p>
      <p className="bh-muted mt-2">Consulting on integration, routing and self-hosting is available on request.</p>
      <p className="mt-3"><a className="text-accent underline" href={contact}>Email florian.standhartinger@gmail.com to discuss an evaluation</a>.</p>
    </section>

    <p className="bh-muted mt-10 border-t border-line pt-4 text-xs">Benchmark Heaven is operated by productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG. <a href="/impressum" className="text-accent underline">Impressum</a> · <a href="/privacy" className="text-accent underline">Privacy</a> · <a href="/terms" className="text-accent underline">Terms</a></p>
  </article>;
}
