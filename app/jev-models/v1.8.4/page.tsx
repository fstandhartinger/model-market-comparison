import { jevMethodLabel } from '../../../lib/jev-decision-limit.mjs';
import { notFound } from 'next/navigation';
import { readJevbenchV184ForBoard, v184BoardInput } from '../../../lib/jevbench-v184-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.8.4: one unranked row on the 27 Oct draw',description:'Granite Switch 4.1 8B measured on the 27 Oct draw, shown unranked until equated.',alternates:{canonical:'/jev-models/v1.8.4'}};
export default async function JevModelsV184Page() {
 const release=await readJevbenchV184ForBoard();if(!release)notFound();
 const board=v184BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-1);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.8.4"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.8.4 · {jevMethodLabel('v1.8.4')}</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.8.4: one unranked row on the 27 Oct draw</h1>
 <p className="mt-3 max-w-3xl">Added one row measured on the 27 Oct regular draw (Granite Switch 4.1 8B (revision 4.1.1, decision adapter)), shown unranked until that draw is equated to the reference scale.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.8.4">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.8.3">Previous v1.8.3</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.8.4' && row.new_in!=='v1.8.4').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev184-method><h2 className="text-2xl font-bold">What changed in v1.8.4</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
