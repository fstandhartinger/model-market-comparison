import { notFound } from 'next/navigation';
import { readJevbenchV177ForBoard, v177BoardInput } from '../../../lib/jevbench-v177-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.7 · Two same-draw self-hosted additions',description:'D1A Gemma 4 E4B and D1A Gemma 4 E2B join as self-hosted rows. Same method; 293 carried rows retain their scores and confidence intervals.',alternates:{canonical:'/jev-models/v1.7.7'}};
export default async function JevModelsV177Page() {
 const release=await readJevbenchV177ForBoard();if(!release)notFound();
 const board=v177BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.7"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.7 · Two same-draw self-hosted additions</div>
 <h1 className="mt-1 text-3xl font-bold">Two same-draw self-hosted additions</h1>
 <p className="mt-3 max-w-3xl">Two new self-hosted rows D1A Gemma 4 E4B and D1A Gemma 4 E2B; no method change. The 10-second rule and common cost basis are unchanged. All 293 carried rows retain their scores and confidence intervals; only placements move.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.7">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.6">Previous v1.7.6</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.7' && row.new_in!=='v1.7.7').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev177-method><h2 className="text-2xl font-bold">What changed in v1.7.7</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
