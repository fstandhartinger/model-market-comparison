import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum" };

// CR-5.5: the operator is the same legal entity that publishes Florian's other ventures (e.g. postial.co/impressum).
export default function ImpressumPage() {
  return <article lang="de" className="max-w-3xl text-sm leading-relaxed text-gray-300">
    <h1 className="text-2xl font-bold text-inherit">Impressum</h1>
    <p className="mt-2">Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz) für Benchmark Heaven.</p>

    <h2 className="mt-6 mb-2 font-semibold">Anbieter</h2>
    <p>productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG<br />Reichenbergerstr. 2<br />94036 Passau<br />Deutschland</p>
    <p className="mt-2">Vertreten durch Florian Standhartinger</p>

    <h2 className="mt-6 mb-2 font-semibold">Kontakt</h2>
    <p>E-Mail: <a className="text-accent" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a><br />Telefon: +49 178 1981631</p>

    <h2 className="mt-6 mb-2 font-semibold">Registereintrag</h2>
    <p>Eingetragen im Handelsregister. Registergericht: Amtsgericht Passau. Registernummer: HRB 8453</p>

    <h2 className="mt-6 mb-2 font-semibold">Umsatzsteuer-Identifikationsnummer</h2>
    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE296812612</p>

    <h2 className="mt-6 mb-2 font-semibold">Verantwortlich für den redaktionellen Inhalt</h2>
    <p>Gemäß § 18 Abs. 2 MStV: Florian Standhartinger, Anschrift wie oben.</p>

    <h2 className="mt-6 mb-2 font-semibold">Verbraucherstreitbeilegung</h2>
    <p>Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
  </article>;
}
