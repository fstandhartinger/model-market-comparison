import { notFound } from 'next/navigation';
import { readJevbenchV1722ForBoard, v1722BoardInput } from '../../../lib/jevbench-v1722-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:'JevBench v1.7.22: Umpire 35B-A3B on the 27 Oct regular draw, shown unranked',description:'Umpire 35B-A3B measured on the 27 Oct regular draw, shown unranked.',alternates:{canonical:'/jev-models/v1.7.22'}};
export default async function JevModelsV1722Page() {
 const release=await readJevbenchV1722ForBoard();if(!release)notFound();
 const board=v1722BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-2);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.22"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.22: Umpire 35B-A3B on the 27 Oct regular draw, shown unranked</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.22: Umpire 35B-A3B on the 27 Oct regular draw, shown unranked</h1>
 <p className="mt-3 max-w-3xl">Added Umpire 35B-A3B (self-hosted) on the 27 Oct regular draw, shown unranked. A 35B-total, 3B-active MoE model measured through the author&apos;s unchanged Transformers server on one A100 80 GB GPU. All 1,500 items were sent; five exceeded its native 16,384-token input cap and returned HTTP 400, scored as misses and unbilled. Output tokens are zero. The cost estimate uses the unchanged 1,489-item basis and a labelled size/architecture-class Qwen3.5-35B-A3B reference: its declared Ornith base is unlisted with no declared parent. Weights are CC BY-NC 4.0 (non-commercial use only); serving code Apache-2.0. The author claims the BF16 weights are his served 4-bit weights dequantized; parity is unverified. Training-data overlap is unchecked. Stronger anchor runs are being measured; the draw is not yet equated to the reference scale.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.22">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.21">Previous v1.7.21</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.22' && row.new_in!=='v1.7.22').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1722-method><h2 className="text-2xl font-bold">What changed in v1.7.22</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
