import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

// CR-5.5: written for what the site actually does — no advertising, optional Google sign-in.
// CR-67.7: aggregate server-side visitor statistics (lib/visit-stats.mjs; decision record CR-67.5-CONSENT-DECISION.md).
export default function PrivacyPage() {
  return <article className="max-w-3xl text-sm leading-relaxed text-gray-300">
    <h1 className="text-2xl font-bold text-inherit">Privacy policy</h1>
    <p className="bh-muted mt-1">Last updated: September 24, 2026</p>

    <h2 className="mt-6 mb-2 font-semibold">Who is responsible</h2>
    <p>productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG, Reichenbergerstr. 2, 94036 Passau, Germany,
      is the controller for this website. Contact: <a className="text-accent" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a>.
      Company details are in the <Link className="text-accent" href="/impressum">Impressum</Link>.</p>

    <h2 className="mt-6 mb-2 font-semibold">Using the site without an account</h2>
    <p>You can use every comparison without signing in. Your filters, settings and saved presets are then kept in your
      browser&apos;s local storage and are not sent to us. To deliver pages, our server necessarily processes technical request
      data such as your IP address, the requested page and your browser type; this is used to run and secure the service
      (Art. 6(1)(f) GDPR) and, without your IP address, for the aggregate <a className="text-accent" href="#visitor-statistics">visitor
      statistics</a> below. We use no tracking or advertising of any kind.</p>

    <h2 id="visitor-statistics" className="mt-6 mb-2 font-semibold">Visitor statistics</h2>
    <p>To see which pages are read and how people find the site, our server counts the page loads it delivers. For each
      day it stores only totals per page and referring website: the number of page loads (opening or reloading a page;
      moving between pages inside the site is not counted), the number of visits (page loads that did not come from
      another page of this site), the requested page (without query parameters) and the host name of the website that
      linked to it (for example <code>news.ycombinator.com</code>, without path or query).</p>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      <li><strong>What is used:</strong> only HTTP headers your browser sends with the page request itself — the Referer
        header (reduced to the host name), the User-Agent header (read in full, only to leave out automated clients, and
        not stored), the Accept, Sec-Fetch-Dest and Sec-Purpose/Purpose headers (to tell a page load from a prefetch or a
        file request) and the Global Privacy Control / Do Not Track signals. These are processed in memory; only the daily
        totals are kept.</li>
      <li><strong>No device access and no identifiers:</strong> the statistics set no cookie, use no local storage, add no
        script, pixel or extra request, and do not use your IP address. No ID, hash or fingerprint is created, so we
        cannot count unique visitors or tell whether two page loads came from the same person, and statistics are never
        linked to accounts. In our assessment no consent is required under § 25 TDDDG for this, so there is no cookie
        banner.</li>
      <li><strong>Purpose and legal basis:</strong> understanding which content is useful and planning capacity; our
        legitimate interest under Art. 6(1)(f) GDPR.</li>
      <li><strong>Where and who:</strong> the totals are kept in our own database on servers of Hetzner Online GmbH in the
        European Union, which acts as our hosting processor. No analytics provider is involved and nothing is passed to
        anyone else. Our internal report only shows pages and referring websites with at least 3 page loads; those with
        fewer than 3 are combined.</li>
      <li><strong>Retention:</strong> daily totals are deleted after 13 months (checked at least hourly). Totals not yet
        written are held in server memory, normally for about a minute and never for more than two days.</li>
      <li><strong>Objection:</strong> if your browser sends a Global Privacy Control or Do Not Track signal, your page loads
        are not counted at all. As the stored totals cannot be traced back to you, we cannot find or remove past counts of
        a single person; you can still object by email to <a className="text-accent" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a>,
        and we will answer and explain how to switch on one of these signals.</li>
    </ul>

    <h2 className="mt-6 mb-2 font-semibold">Accounts (Sign in with Google)</h2>
    <p>If you choose to sign in, Google shares your Google account ID, email address, name and profile picture link with us.
      We store exactly these, the presets and settings you save, and when the account was created and last signed in to.
      We use them only to provide your account and sync your presets and settings across browsers
      (Art. 6(1)(b) GDPR). Sign-in itself is handled by Google Ireland Limited under
      its <a className="text-accent" href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">privacy policy</a>.</p>
    <p className="mt-2">While you are signed in, strictly necessary cookies keep the session (for up to 30 days) and protect
      sign-in requests against forgery. They are required for the account to work (§ 25(2) TDDDG).</p>

    <h2 className="mt-6 mb-2 font-semibold">Priority evaluation requests</h2>
    <p>When you request a paid priority evaluation, we process your email address, model name, model and code links,
      access instructions, optional notes, selected benchmark, result visibility, payment status and the dates needed to
      manage the request. We use this information to review and run the requested evaluation, contact you, issue refunds
      when due, and meet accounting obligations (Art. 6(1)(b) and (c) GDPR). Do not enter passwords, API keys or other
      access tokens in the form. Credentials needed for an evaluation must be sent separately using the encrypted method
      we provide after review.</p>
    <p className="mt-2">The request is stored in our own PostgreSQL database on Hetzner servers in the European Union.
      Stripe processes checkout, payment and billing information as our payment provider; applicable tax details and
      payment receipts are handled through Stripe. We keep request details for as long as needed to complete the service,
      handle disputes and refunds, and meet statutory retention duties. Payment and tax records are retained for the
      periods required by law. You can ask us about access, correction or deletion at
      <a className="text-accent" href="mailto:info@productivity-boost.com"> info@productivity-boost.com</a>; legal
      retention duties may limit deletion of accounting records.</p>

    <h2 className="mt-6 mb-2 font-semibold">Deleting your data</h2>
    <p>Your account data is kept until you delete it. On the <Link className="text-accent" href="/account">Account</Link> page,
      &ldquo;Delete my account and data&rdquo; removes your account, presets and settings from our database immediately.
      You can also ask us by email.</p>

    <h2 className="mt-6 mb-2 font-semibold">Hosting</h2>
    <p>The site and its database run on servers of Hetzner Online GmbH in the European Union, acting as our processor.
      Your data is not sold or shared for advertising.</p>

    <h2 className="mt-6 mb-2 font-semibold">Your rights</h2>
    <p>You have the right to access, rectify and erase your data, to restrict or object to its processing, and to data
      portability. You may also lodge a complaint with a data protection supervisory authority, for example the Bavarian
      Data Protection Authority (BayLDA).</p>
  </article>;
}
