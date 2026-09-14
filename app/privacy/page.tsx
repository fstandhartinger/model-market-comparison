import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

// CR-5.5: written for what the site actually does — no analytics or advertising, optional Google sign-in.
export default function PrivacyPage() {
  return <article className="max-w-3xl text-sm leading-relaxed text-gray-300">
    <h1 className="text-2xl font-bold text-inherit">Privacy policy</h1>
    <p className="bh-muted mt-1">Last updated: September 14, 2026</p>

    <h2 className="mt-6 mb-2 font-semibold">Who is responsible</h2>
    <p>productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG, Reichenbergerstr. 2, 94036 Passau, Germany,
      is the controller for this website. Contact: <a className="text-accent" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a>.
      Company details are in the <Link className="text-accent" href="/impressum">Impressum</Link>.</p>

    <h2 className="mt-6 mb-2 font-semibold">Using the site without an account</h2>
    <p>You can use every comparison without signing in. Your filters, settings and saved presets are then kept in your
      browser&apos;s local storage and are not sent to us. To deliver pages, our server necessarily processes technical request
      data such as your IP address, the requested page and your browser type; this is used only to run and secure the service
      (Art. 6(1)(f) GDPR). We use no analytics, tracking or advertising cookies.</p>

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
