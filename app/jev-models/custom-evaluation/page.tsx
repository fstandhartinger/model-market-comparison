import type { Metadata } from "next";
import { previewMetadata } from "../../../lib/seo";

export const metadata: Metadata = previewMetadata({
  path: "/jev-models/custom-evaluation",
  documentTitle: "You need a custom Jev-class eval?",
  title: "You need a custom Jev-class eval? | Benchmark Heaven",
  description: "You need a custom eval? Run the open-source JevBench harness on your own data, contribute to the community benchmark, or ask us to help.",
});

const contact = "mailto:florian.standhartinger@gmail.com?subject=Custom%20Jev-class%20model%20evaluation";

export default function CustomEvaluationPage() {
  return <article className="max-w-3xl text-[15px] leading-relaxed">
    <header className="bh-page-head">
      <p className="bh-eyebrow">JevBench · open source and community-run</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Evaluate Jev-class systems on the data that matters to you</h1>
      <p className="bh-muted mt-3 max-w-2xl text-lg">JevBench is our free, open-source benchmark for the community. You can run the same harness yourself, contribute new systems and tasks, or ask us to help with a custom evaluation.</p>
    </header>

    <section className="mt-8" aria-labelledby="custom-what">
      <h2 id="custom-what" className="text-xl font-semibold">You need a custom eval?</h2>
      <p className="bh-muted mt-2">We can run relevant entrants on your labelled dataset, report accuracy, calibration, latency and cost, and help you reason about integration, routing and self-hosting. The scope depends on your data and requirements, so it starts with a conversation rather than a package or a price list.</p>
    </section>

    <section className="mt-7" aria-labelledby="custom-need">
      <h2 id="custom-need" className="text-xl font-semibold">What we need</h2>
      <p className="bh-muted mt-2">A labelled sample, a clear task definition, and your expected volume and latency requirements. We use your data only for your evaluation, do not publish it, and delete it on request.</p>
    </section>

    <section className="mt-7" aria-labelledby="custom-get">
      <h2 id="custom-get" className="text-xl font-semibold">What you get</h2>
      <p className="bh-muted mt-2">A written report with our recommendation and the raw results, so you can inspect every system and make your own decision.</p>
    </section>

    <section className="mt-8 rounded-xl border border-line bg-panel p-5" aria-labelledby="custom-yourself">
      <p className="bh-eyebrow">Free and open source</p>
      <h2 id="custom-yourself" className="mt-1 text-xl font-semibold">Do it yourself with JevBench</h2>
      <p className="bh-muted mt-2">Clone <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench">github.com/fstandhartinger/jevbench</a>, put your labelled decisions in the repository&apos;s JSONL task format, and run the harness with the adapter for your system:</p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-4 text-xs leading-relaxed"><code>{`git clone https://github.com/fstandhartinger/jevbench.git
cd jevbench
python -m unittest discover -s tests -v

python -m jevbench.cli run --tasks path/to/your-data.jsonl \\
  --adapter typesafe --endpoint https://your-endpoint.example \\
  --key-env YOUR_API_KEY --model your-model \\
  --results RUN/results.jsonl --raw-dir RUN/raw \\
  --ledger RUN/ledger.jsonl --cap-usd 15 --manifest RUN/manifest.json

python -m jevbench.cli summarize --tasks path/to/your-data.jsonl \\
  --results RUN/results.jsonl --public-export RUN/summary.json`}</code></pre>
      <p className="bh-muted mt-3 text-sm">The code is licensed under the <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/blob/main/LICENSE">MIT licence</a>. API keys stay in environment variables; use <code>--key-env &apos;&apos;</code> for an endpoint that needs no authorization. The repository includes public example tasks and documents the adapters and result format.</p>
      <p className="mt-3">Have a Jev-class system or a useful task set? <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench">Open an issue or contribute it on GitHub</a> so the benchmark can grow with the community.</p>
    </section>

    <section className="mt-7" aria-labelledby="custom-contact">
      <h2 id="custom-contact" className="text-xl font-semibold">Start with an email</h2>
      <p className="bh-muted mt-2">If you need a custom eval and would rather work through it with us, tell us about the task, dataset and decision you need to make. Evaluation and consulting arrangements are discussed by email; we do not present custom work as part of the free open-source project.</p>
      <p className="mt-3"><a className="text-accent underline" href={contact}>Email florian.standhartinger@gmail.com to discuss an evaluation</a>.</p>
    </section>

    <p className="bh-muted mt-10 border-t border-line pt-4 text-xs">Benchmark Heaven is operated by productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG. <a href="/impressum" className="text-accent underline">Impressum</a> · <a href="/privacy" className="text-accent underline">Privacy</a> · <a href="/terms" className="text-accent underline">Terms</a></p>
  </article>;
}
