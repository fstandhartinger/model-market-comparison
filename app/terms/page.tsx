import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of use" };

// CR-5.5: plain terms for a free, read-only comparison site with optional accounts.
export default function TermsPage() {
  return <article className="max-w-3xl text-sm leading-relaxed text-gray-300">
    <h1 className="text-2xl font-bold text-inherit">Terms of use</h1>
    <p className="bh-muted mt-1">Last updated: September 14, 2026</p>

    <h2 className="mt-6 mb-2 font-semibold">The service</h2>
    <p>Benchmark Heaven is a free website operated by productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG
      (see <Link className="text-accent" href="/impressum">Impressum</Link>). It collects published benchmark results and prices
      for AI models and shows a modeled cost per task.</p>

    <h2 className="mt-6 mb-2 font-semibold">No guarantee of accuracy</h2>
    <p>Every number comes from a named source with a date, and modeled costs are estimates. Sources change and can be wrong.
      The information is provided as is, without warranty, and is not advice for any purchase or business decision.
      Check the original source before relying on a value. We are liable without limitation for intent and gross negligence,
      and under the statutory provisions for injury to life, body or health; otherwise liability for a free service is excluded
      as far as the law permits.</p>

    <h2 className="mt-6 mb-2 font-semibold">Accounts</h2>
    <p>An account is optional and free. It stores your saved presets and settings. You can delete it at any time on
      the <Link className="text-accent" href="/account">Account</Link> page. Please do not misuse the service, for example by
      automated mass requests that impair it; the public <a className="text-accent" href="https://github.com/fstandhartinger/model-market-comparison/blob/main/API.md">API</a> is
      the intended way to use the data programmatically.</p>

    <h2 className="mt-6 mb-2 font-semibold">Privacy</h2>
    <p>How we handle personal data is described in the <Link className="text-accent" href="/privacy">privacy policy</Link>.</p>

    <h2 className="mt-6 mb-2 font-semibold">Law</h2>
    <p>German law applies. Mandatory consumer protection rules of your country of residence remain unaffected.</p>
  </article>;
}
