import { notFound } from 'next/navigation';
import { readJevbenchV179ForBoard, v179BoardInput } from '../../../lib/jevbench-v179-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.9 · One same-draw self-hosted addition',description:'GLiClass v4 9B joins as a self-hosted row. Same method; one new row, one price correction and vendor link fixes.',alternates:{canonical:'/jev-models/v1.7.9'}};
export default async function JevModelsV179Page() {
 const release=await readJevbenchV179ForBoard();if(!release)notFound();
 const board=v179BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes;
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.9"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.9 · One same-draw self-hosted addition</div>
 <h1 className="mt-1 text-3xl font-bold">One same-draw self-hosted addition</h1>
 <p className="mt-3 max-w-3xl">One new self-hosted row GLiClass v4 9B; Myles-G 12B now priced at its public list price; Super Decider links point to the vendor page; no method change. GLiClass answered 1,485 of 1,500 requests; 15 HTTP 422 length refusals count as misses. Its cost is an ESTIMATE from Qwen/Qwen3.5-9B with zero generated output. Myles-G 12B uses GBP 0.0015 per million input tokens, output free; prices exclude VAT. Price corrected in v1.7.9; earlier releases showed a same-base ESTIMATE of USD 0.0264 per 1,000. All other scores and confidence intervals are unchanged.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.9">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.8">Previous v1.7.8</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.9' && row.new_in!=='v1.7.9').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev179-method><h2 className="text-2xl font-bold">What changed in v1.7.9</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
