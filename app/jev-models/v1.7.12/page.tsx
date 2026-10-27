import { notFound } from 'next/navigation';
import { readJevbenchV1712ForBoard, v1712BoardInput } from '../../../lib/jevbench-v1712-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.12: self-hosted cost disclosures',description:'Jez Large, Jez Small and two D1A Gemma 4 rows receive cost-basis wording updates. Numeric costs, scores, ranks and measurement records stay unchanged.',alternates:{canonical:'/jev-models/v1.7.12'}};
export default async function JevModelsV1712Page() {
 const release=await readJevbenchV1712ForBoard();if(!release)notFound();
 const board=v1712BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.12"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.12: self-hosted cost disclosures</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.12: self-hosted cost disclosures</h1>
 <p className="mt-3 max-w-3xl">Four existing rows receive cost-basis wording updates: Jez Large, Jez Small and two D1A Gemma 4 rows. Their numeric costs, scores, ranks and measurement records are unchanged. No new measurement or method change.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.12">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.11">Previous v1.7.11</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.12' && row.new_in!=='v1.7.12').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1712-method><h2 className="text-2xl font-bold">What changed in v1.7.12</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
