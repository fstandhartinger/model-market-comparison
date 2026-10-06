import type { Metadata } from 'next';
import Link from 'next/link';
import { readJevbenchSeoData } from '../../../../lib/jevbench-seo.mjs';
import { jevIntentMetadata } from '../../../../lib/jevbench-seo-metadata';
import { JevBenchRankingTable } from '../../../../components/JevBenchRankingTable';
import { DatasetFaqJsonLd, JevFaq, ApiBoardNote } from '../../../../components/JevBenchSeoBlocks';
import { oneDe, usdPerThousandDe, costBasisLabelDe, monthDe, DE } from '../../../../components/JevBenchSeoDe';
import { jevSystemPath } from '../../../../lib/jev-system-slug.mjs';

const PATH = '/de/jev-models/alternativen';
const EN_PATH = '/jev-models/alternatives';
export async function generateMetadata(): Promise<Metadata> {
  const data = await readJevbenchSeoData();
  return jevIntentMetadata({path: PATH, title: `Jev-Alternativen im Vergleich (${monthDe(data.date)}): ${data.systems.length} Modelle auf JevBench gemessen`,
    description: `${data.systems.length} gemessene Jev-kompatible Modelle im Vergleich (${monthDe(data.date)}): Capability, Intelligenz, Kalibrierung, Preis, Latenz und Open-Weight-Belege.`,
    keywords: ['Jev Alternative', 'Jev Alternativen', 'Jev Open Source', 'Jev Benchmark Deutsch', 'Jev Alternative DSGVO', 'JevBench'],
    languages: {en: EN_PATH, de: PATH, 'x-default': EN_PATH}, locale: 'de_DE'});
}
export default async function JevAlternativenPage() {
  const data = await readJevbenchSeoData();
  const month = monthDe(data.date);
  const bestOpen = data.openWeightAlternatives.find((r) => r.capability_eligible);
  const faq = [
    {question: 'Was vergleicht JevBench?', answer: `JevBench ${data.artifact.revision} misst Jev-kompatible Entscheidungsmodelle auf vier Achsen: Intelligenz, Kalibrierung, Geschwindigkeit und Kosten. Der Capability Score ist der Mittelwert aus Intelligenz und Kalibrierung, aber nur innerhalb der festgelegten Kosten- und Latenzgrenzen (Median). Der Composite-Wert ist nachrangig.`},
    {question: 'Welche Open-Weight-Alternative zu Jev erreicht den höchsten Wert?', answer: bestOpen ? `${bestOpen.display} hat unter den Open-Weight-Modellen der Jev-Klasse den höchsten berücksichtigten Capability Score: ${oneDe(bestOpen.capability)}, Rang ${bestOpen.rank} auf dem Open-Weights-Board. Der Wert stammt aus der aktuellen Messung und gilt nur für die dort dokumentierten Bedingungen.` : 'In dieser Version hat keine Open-Weight-Alternative einen berücksichtigten Capability-Wert mit veröffentlichten Belegen.'},
    {question: 'Was gilt hier als Open-Weight- bzw. Open-Source-Alternative?', answer: 'Die veröffentlichte Zeile muss öffentlichen Code oder öffentliche Gewichte, eine Lizenz und einen Quellenlink enthalten. Fehlen Belege, bleibt die Einstufung „unbekannt“. Die Bedingungen können sich für Code, Adapter und Gewichte unterscheiden; lesen Sie die Lizenz vor dem Einsatz.'},
    {question: 'Sind Preise und Latenz direkt gemessen?', answer: 'Jede Zeile kennzeichnet den Preis als gemessen, geschätzt oder selbst angegeben. Die Latenz stammt aus den veröffentlichten Benchmark-Bedingungen und kann eine offengelegte Anpassung enthalten. Für eine andere Last oder Hardware sind beide Werte keine Zusage.'},
  ];
  return <div lang="de" data-bh-lang="de">
    <DatasetFaqJsonLd path={PATH} artifact={data.artifact} faq={faq} breadcrumbName="Jev-Alternativen" de={{
      datasetName: `JevBench ${data.artifact.revision}: veröffentlichte Gesamtergebnisse – Benchmark Heaven`,
      datasetDescription: 'Veröffentlichte Gesamtergebnisse für Jev-kompatible Entscheidungsmodelle mit getrennten Messwerten für Intelligenz, Kalibrierung, Geschwindigkeit und Kosten.'}} />
    <header className="bh-page-head"><h1 className="text-3xl font-bold">Jev-Alternativen im Vergleich ({month})</h1>
      <p className="bh-muted mt-3">Benchmark Heaven misst {data.systems.length} Jev-kompatible Modelle unabhängig auf JevBench; {data.openRanked.length} Open-Weights-Systeme sind auf dem Open-Weights-Board gerankt. Jev 1.13.0 ist die ungerankte Referenz ({oneDe(data.reference.capability)} Capability); API-Angebote werden auf dem API-Leaderboard gerankt. Der Capability Score ist der Mittelwert aus Intelligenz und Kalibrierung innerhalb der festgelegten Kosten- und Latenzgrenzen. Wrapper und subventionierte Angebote sind vom Ranking ausgenommen.</p>
      <p className="bh-muted mt-2 text-sm">Daten: JevBench {data.artifact.revision}, veröffentlicht am <Link className="text-accent underline" href={data.releasePage}>{new Date(data.date).toLocaleDateString(DE, {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'})}</Link>. Preisangaben sind je Zeile als gemessen, geschätzt oder selbst angegeben gekennzeichnet.</p>
      <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="JevBench">
        <Link className="text-accent underline" href="/jev-models">Live-Rangliste (Englisch)</Link>
        <Link className="text-accent underline" href={EN_PATH} hrefLang="en" lang="en">English version: Best Jev alternatives</Link>
        <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench">Methode und Repository</a>
      </nav>
    </header>
    <section className="bh-panel mt-6 p-5"><h2 className="text-xl font-semibold">Die Top 15 nach Capability Score</h2>
      <JevBenchRankingTable rows={data.ranked.slice(0,15)} locale="de"/>
      <ApiBoardNote rows={data.apiRows} locale="de"/>
    </section>
    <section className="bh-panel mt-6 p-5"><h2 className="text-xl font-semibold">Open-Weight-Alternativen der Jev-Klasse</h2>
      <p className="bh-muted mt-2">Gezeigt werden nur Messungen der aktuellen Version; Jev 1.13.0 ist die Referenzzeile. Zeilen außerhalb der Grenzen erhalten keinen Capability-Rang. Prüfen Sie vor dem Self-Hosting die Lizenz und das dokumentierte Setup.</p>
      <JevBenchRankingTable rows={[data.reference, ...data.openWeightAlternatives]} locale="de"/>
      <ul className="mt-4 space-y-2">{data.openWeightAlternatives.map((r) => <li key={r.key}><Link href={jevSystemPath(r.key)} className="text-accent underline">{r.display}</Link>: {r.licence} · {r.speed?.hardware ?? r.endpoint_condition ?? r.speed?.measured_where ?? 'Setup nicht angegeben'}{r.repo && <> · <a href={r.repo} className="text-accent underline">Veröffentlichter Code bzw. Gewichte</a></>}</li>)}</ul>
    </section>
    <section className="mt-6 grid gap-4 md:grid-cols-3">{[
      ['Genaueste (Achse Intelligenz)',data.winners.mostAccurate], ['Schnellste (Achse Geschwindigkeit)',data.winners.fastest], ['Günstigste pro Entscheidung',data.winners.cheapest],
    ].map(([label,row]) => { const r = row as typeof data.winners.mostAccurate; return r && <article key={String(label)} className="bh-panel p-5"><h2 className="font-semibold">{String(label)}</h2><p><Link href={jevSystemPath(r.key)} className="text-accent underline">{r.display}</Link></p><p>Intelligenz {oneDe(r.axes.intelligence)} · Geschwindigkeit {oneDe(r.axes.speed)}</p><p>{usdPerThousandDe(r.cost?.usd_per_1000)} ({costBasisLabelDe(r.cost?.kind)})</p></article>; })}</section>
    <section className="bh-panel mt-6 p-5"><h2 className="text-xl font-semibold">Worauf sollten Sie bei einer Jev-Alternative achten?</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><b>Lizenz:</b> Code, Adapter und Gewichte können unterschiedlichen Bedingungen unterliegen. Entscheidend ist die Lizenz in der veröffentlichten Zeile, nicht der Modellname.</li>
        <li><b>Hardware:</b> Die Messwerte gelten für das dokumentierte Setup. Auf anderer Hardware oder mit anderer Quantisierung können Qualität und Tempo abweichen.</li>
        <li><b>Latenz:</b> Wir weisen den Median (p50) unter den Benchmark-Bedingungen aus. Prüfen Sie die Latenz mit Ihrer eigenen Last und Netzanbindung.</li>
        <li><b>Kosten pro 1.000 Entscheidungen:</b> Der Preis ist als gemessen, geschätzt oder selbst angegeben gekennzeichnet. Selbst angegebene Preise haben wir nicht überprüft.</li>
        <li><b>Datenschutz und Self-Hosting in der EU:</b> Open-Weight-Modelle lassen sich grundsätzlich auf eigener Infrastruktur oder bei einem Anbieter mit Standort in der EU betreiben, sodass Daten nicht an einen Drittanbieter außerhalb der EU gesendet werden müssen. Ob ein konkreter Einsatz den Datenschutzanforderungen genügt, hängt von Ihrem Fall ab und ist keine Aussage dieser Seite; holen Sie dazu bei Bedarf fachkundigen Rat ein.</li>
      </ul>
      <p className="mt-4"><Link href="/jev-models/how-to-choose" className="text-accent underline">Auswahl nach Anwendungsfall und Messbedingungen (Englisch)</Link></p>
    </section>
    <JevFaq items={faq} heading="Häufige Fragen"/>
  </div>;
}
