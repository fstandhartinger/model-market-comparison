import { notFound } from 'next/navigation';
import { readJevbenchV1720ForBoard, v1720BoardInput } from '../../../lib/jevbench-v1720-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.20: Lychee-27B',description:'Lychee-27B measured on 13 Oct 2026 on the 12 Oct draw as a paid priority evaluation, published at the customer request.',alternates:{canonical:'/jev-models/v1.7.20'}};
export default async function JevModelsV1720Page() {
 const release=await readJevbenchV1720ForBoard();if(!release)notFound();
 const board=v1720BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-2);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.20"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.20: Lychee-27B</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.20: Lychee-27B</h1>
 <p className="mt-3 max-w-3xl">Added Lychee-27B, measured on 13 Oct 2026 on the 12 Oct regular draw as a paid priority evaluation; published at the customer&apos;s request. The estimated cost exceeds the official cost cap, so this row is outside the default cost-capped Capability ranking.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.20">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.19">Previous v1.7.19</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.20' && row.new_in!=='v1.7.20').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1720-method><h2 className="text-2xl font-bold">What changed in v1.7.20</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
