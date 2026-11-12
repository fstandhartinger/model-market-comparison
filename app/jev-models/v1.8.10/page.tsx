import { jevMethodLabel } from '../../../lib/jev-decision-limit.mjs';
import { notFound } from 'next/navigation';
import { readJevbenchV1810ForBoard, v1810BoardInput } from '../../../lib/jevbench-v1810-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.8.10: the 27 Oct draw equated and ranked',description:'The 27 Oct regular draw is equated to the reference scale with four strong anchor systems and its rows are ranked.',alternates:{canonical:'/jev-models/v1.8.10'}};
export default async function JevModelsV1810Page() {
 const release=await readJevbenchV1810ForBoard();if(!release)notFound();
 const board=v1810BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.8.10"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.8.10 · {jevMethodLabel('v1.8.10')}</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.8.10: the 27 Oct draw equated with four strong anchors and ranked</h1>
 <p className="mt-3 max-w-3xl">Equated the 27 Oct regular draw with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points) and ranked 31 of its rows; four stay unranked because their top-five places lie within the uncertainty of the shift; renamed AutoTrust&apos;s JEV-27B to AutoTrust-Decider-Pro-27B at the vendor&apos;s request.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.8.10">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.8.9">Previous v1.8.9</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.8.10' && row.new_in!=='v1.8.10').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1810-method><h2 className="text-2xl font-bold">What changed in v1.8.10</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
