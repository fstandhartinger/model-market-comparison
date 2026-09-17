import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

// CR-5.5: written for what the site actually does — no advertising, optional Google sign-in.
// CR-67.7: aggregate server-side visitor statistics (lib/visit-stats.mjs; decision record CR-67.5-CONSENT-DECISION.md).
export default function PrivacyPage() {
  return <article className="max-w-3xl text-sm leading-relaxed text-gray-300">
    <h1 className="text-2xl font-bold text-inherit">Privacy policy</h1>
    <p className="bh-muted mt-1">Last updated: September 17, 2026</p>

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
    <p>To see which pages are read and how people find the site, our server counts the page requests it delivers. For each
      day it stores only totals: the number of page loads (opening or reloading a page; moving between pages inside the
      site is not counted), the number of visits (page loads that did not come from another page of this site), the requested page (without query parameters) and the host name of the website that linked to
      it (for example <code>news.ycombinator.com</code>, from the Referer header, without path or query). Your browser type
      is checked only to leave out automated visitors and is not stored.</p>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      <li><strong>No device access:</strong> we set no cookie, use no local storage, run no tracking script or pixel and
        read nothing from your device for this. Only information your browser sends with every page request is used, so no
        consent is needed under § 25 TDDDG and there is no cookie banner.</li>
      <li><strong>No identifiers:</strong> your IP address is not used, and no ID, hash or fingerprint is created. We
        therefore cannot count unique visitors and cannot tell whether two page views came from the same person.
        Statistics are never linked to accounts.</li>
      <li><strong>Purpose and legal basis:</strong> understanding which content is useful and planning capacity; our
        legitimate interest under Art. 6(1)(f) GDPR.</li>
      <li><strong>Where and how long:</strong> on our own server and database at Hetzner Online GmbH in the European Union;
        no analytics provider or other recipient is involved. Daily totals are deleted after 13 months.</li>
      <li><strong>Objection:</strong> if your browser sends a Global Privacy Control or Do Not Track signal, your page views
        are not counted. You can also object by email to <a className="text-accent" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a>.</li>
    </ul>

    <h2 className="mt-6 mb-2 font-semibold">Accounts (Sign in with Google)</h2>
    <p>If you choose to sign in, Google shares your Google account ID, email address, name and profile picture link with us.
      We store exactly these, the presets and settings you save, and when the account was created and last signed in to.
      We use them only to provide your account and sync your presets and settings across browsers
      (Art. 6(1)(b) GDPR). Sign-in itself is handled by Google Ireland Limited under
      its <a className="text-accent" href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">privacy policy</a>.</p>
    <p className="mt-2">While you are signed in, strictly necessary cookies keep the session (for up to 30 days) and protect
      sign-in requests against forgery. They are required for the account to work (§ 25(2) TDDDG).</p>

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
