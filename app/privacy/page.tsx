import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

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
      browser&apos;s local storage and are not sent to us. To deliver pages and run and secure the service, our server
      processes technical request data such as your IP address, requested page and browser type. Analytics is described
      below. We do not use advertising or cross-site tracking.</p>

    <h2 id="visitor-statistics" className="mt-6 mb-2 font-semibold">Website analytics</h2>
    <p>We run Umami ourselves on our Sandy PaaS. The tracker and its event requests use the <code>/analytics</code> path
      on this website and are forwarded to our Umami installation. We use the reports to understand which Benchmark
      Heaven pages people read and how they find them, and to improve the service. Our basis is our legitimate interest
      in operating and improving the website (Art. 6(1)(f) GDPR).</p>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      <li><strong>What we collect:</strong> page views, page paths, referring website host names, browser, operating
        system, device category and country. On the model comparison pages, we keep only the public model IDs needed to
        distinguish a compared pair; all other query strings and URL fragments are removed. Referrer paths and query
        strings are also removed.</li>
      <li><strong>Daily visitor count:</strong> Umami derives a rotating, pseudonymous daily identifier using the website,
        the request IP address and browser User-Agent with a salt that changes daily. This lets the report estimate unique
        visitors per day; it does not link visits across days or websites. Umami uses the request IP to determine country
        and derive the daily identifier, but does not store the raw IP address in its analytics database.</li>
      <li><strong>Browser controls:</strong> the tracker sets no cookies or persistent browser identifier, honors Do Not Track
        and Global Privacy Control, and uses Umami&apos;s default automated-traffic filtering. Its signed session token stays
        in memory for the current page session. We do not show an analytics consent banner.</li>
      <li><strong>Where and for how long:</strong> Umami runs on our Sandy PaaS and stores analytics in a dedicated
        PostgreSQL database on our server. The analytics records are automatically deleted after 13 months. No
        third-party analytics provider receives them.</li>
      <li><strong>Objection:</strong> you can stop future Umami collection by enabling your browser&apos;s Do Not Track
        setting. Our separate server-side totals also skip Do Not Track and Global Privacy Control requests. You can
        contact <a className="text-accent" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a>
        with questions or an objection.</li>
    </ul>

    <h2 className="mt-6 mb-2 font-semibold">Separate server-side page totals</h2>
    <p>Separately from Umami, our page server keeps daily aggregate totals per page path and external referring host.
      This counter reads the request headers needed to recognise a page load, remove automated clients and reduce a
      referrer to its host name. It does not use an IP address or create a visitor identifier, and it does not count
      in-app page navigation. Only totals are stored; they are deleted after 13 months. Its internal report combines
      low-count rows rather than showing individual low-volume pages or referrers.</p>

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
