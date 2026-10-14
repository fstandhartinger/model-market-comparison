import { notFound } from 'next/navigation';
import Link from 'next/link';
import { readOptionalJevbenchV1619Release } from '../../../lib/jevbench-v1619-release.mjs';

export const metadata = { title: 'Ventus-2B · JevBench v1.6.19', alternates: { canonical: '/jev-models/ventus-2b' } };
const one = (value: number) => value.toFixed(3);

export default async function VentusSystemPage() {
  const release = await readOptionalJevbenchV1619Release();
  if (!release) notFound();
  const row = release.artifact.systems.find((s: { key: string }) => s.key === 'ventus-2b');
  if (!row) notFound();
  return <>
    <nav><Link href="/jev-models" className="text-accent underline">Back to JevBench</Link> · <Link href="/jev-models/v1.6.19" className="text-accent underline">Measurement release v1.6.19</Link></nav>
    <header className="bh-page-head mt-3">
      <h1 className="text-3xl font-bold">{row.display}</h1>
      <p className="mt-3">Measured {row.last_measured_on} on draw {release.proof.draw_release}: 1,485 of 1,500 answered, 15 pre-registered HTTP 422 refusals.</p>
      <p className="bh-muted mt-2">These are this release&rsquo;s own numbers. Capability {one(row.capability)}; composite A {one(row.scores.A)}, rank {row.rank} of {release.artifact.n_ranked} within this draw. The merged board applies its cost and latency limits separately.</p>
    </header>
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Measured axes">
      {(['intelligence', 'calibration', 'speed', 'cost'] as const).map(axis => <div className="bh-panel p-4" key={axis}><h2 className="capitalize">{axis}</h2><p className="text-2xl font-semibold">{one(row.axes[axis])}</p></div>)}
    </section>
    <section className="bh-panel mt-6 p-5" data-bh-ventus-attribution>
      <h2 className="font-semibold">Licence and attribution</h2>
      <p className="mt-2">Ventus-2B by Ethan Xie (https://github.com/XieShaocong33Ethan/Ventus-2B)</p>
      <p className="bh-muted mt-2">{row.licence}</p>
    </section>
    <section className="bh-panel mt-6 p-5">
      <h2 className="font-semibold">Cost and measurement conditions</h2>
      <p className="mt-2">USD {row.cost.usd_per_1000.toFixed(9)} per 1,000 decisions (estimated).</p>
      <p className="bh-muted mt-2">{row.cost.basis}</p>
      <p className="mt-2">Official-subset raw median {one(row.speed.p50_s_raw)} s, raw p95 {one(row.speed.p95_s_raw)} s; adjusted median {one(row.speed.p50_s_adjusted)} s. {row.speed.adjustment}.</p>
      <p className="bh-muted mt-2">{row.endpoint_condition}</p>
    </section>
    <section className="bh-panel mt-6 p-5"><h2 className="font-semibold">Artifact history</h2><p className="bh-muted mt-2">{row._artifact_note}</p><p className="mt-2">Evaluated pin: {row.model_pin}</p></section>
    <p className="mt-4"><a className="text-accent underline" href={row.repo}>Published weights and model card</a> · <Link href="/api/jevbench/v1.6.19" className="text-accent underline">Aggregate results JSON</Link></p>
  </>;
}
