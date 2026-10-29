import { notFound } from 'next/navigation';
import { readJevbenchV1723ForBoard, v1723BoardInput } from '../../../lib/jevbench-v1723-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.23: Text-only corrections',description:'Text-only corrections; no score, cost or rank changed.',alternates:{canonical:'/jev-models/v1.7.23'}};
export default async function JevModelsV1723Page() {
 const release=await readJevbenchV1723ForBoard();if(!release)notFound();
 const board=v1723BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.23"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.23: Text-only corrections</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.23: Text-only corrections</h1>
 <p className="mt-3 max-w-3xl">Text-only corrections: removed internal process references from published notes, corrected the KnowLine and DecisionNode descriptions and the over-limit wording; no score, cost or rank changed.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.23">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.22">Previous v1.7.22</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.23' && row.new_in!=='v1.7.23').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1723-method><h2 className="text-2xl font-bold">What changed in v1.7.23</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
