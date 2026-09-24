import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of use" };

// CR-5.5: plain terms for a free, read-only comparison site with optional accounts.
export default function TermsPage() {
  return <article className="max-w-3xl text-sm leading-relaxed text-gray-300">
    <h1 className="text-2xl font-bold text-inherit">Terms of use</h1>
    <p className="bh-muted mt-1">Last updated: September 24, 2026</p>

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

    <h2 className="mt-6 mb-2 font-semibold">Priority evaluation requests</h2>
    <p>Priority evaluation is an optional paid service for earlier scheduling. It does not change the benchmark method,
      task set, score or rank. We decide which models we can evaluate and when, and we may evaluate a model on our own
      schedule if it is of public interest. The regular community benchmark remains free.</p>
    <p className="mt-2">The fee is USD 49 per selected benchmark for API-served models or open models up to about 9B parameters,
      or USD 99 per selected benchmark for larger open models that we run on our GPUs. Selecting both JevBench and
      ImageJevBench incurs the selected fee twice. Applicable taxes are calculated at checkout. Payment is completed
      through Stripe Checkout; Stripe sends the payment receipt to the email address provided at checkout.</p>
    <p className="mt-2">Every submission is reviewed before evaluation. We may refuse a submission that is unsafe or cannot be
      evaluated fairly, and we will issue a full refund. After a submission passes code review, we provide its results
      within 48 hours. If we miss that deadline, we automatically issue a full refund. The 48-hour period starts when we
      tell you the code review has passed.</p>
    <p className="mt-2">For a public request, you authorize us to publish the resulting aggregate leaderboard row, marked
      “priority run”. A private request produces a report for your team and is not published without your consent. We may
      still evaluate the model later on our own schedule if it becomes a matter of public interest. You must not submit
      API keys, passwords or access tokens through the request form. Any later credential handover must use the
      encrypted process we provide.</p>

    <h2 className="mt-6 mb-2 font-semibold">Privacy</h2>
    <p>How we handle personal data is described in the <Link className="text-accent" href="/privacy">privacy policy</Link>.</p>

    <h2 className="mt-6 mb-2 font-semibold">Law</h2>
    <p>German law applies. Mandatory consumer protection rules of your country of residence remain unaffected.</p>
  </article>;
}
