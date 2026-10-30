import { seoTitle } from '../../../lib/seo';
import { notFound } from 'next/navigation';
import { readJevbenchV1719ForBoard, v1719BoardInput } from '../../../lib/jevbench-v1719-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { PageJsonLd } from '../../../components/PageJsonLd';
export const metadata = {title:seoTitle('JevBench v1.7.19 — DecisionNode models'),description:'DecisionNode and DecisionNode Flash measured on the 27 Oct regular draw, shown unranked and not priced.',alternates:{canonical:'/jev-models/v1.7.19'}};
export default async function JevModelsV1719Page() {
 const release=await readJevbenchV1719ForBoard();if(!release)notFound();
 const board=v1719BoardInput(release);
 const notes=(release.artifact as unknown as {measurement_notes:string[]}).measurement_notes.slice(-3);
 return <><PageJsonLd meta={metadata}/><JevBenchReleaseVersionNav active="v1.7.19"/>
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.19: DecisionNode and DecisionNode Flash (hosted, unranked and not priced)</div>
 <h1 className="mt-1 text-3xl font-bold">JevBench v1.7.19: DecisionNode and DecisionNode Flash (hosted, unranked and not priced)</h1>
 <p className="mt-3 max-w-3xl">Added DecisionNode and DecisionNode Flash (hosted) on the 27 Oct regular draw, shown unranked and not priced. Hosted API by Bynn, measured directly through the vendor&apos;s synchronous endpoint. All 1,500 items were sent; 5 items over the provider&apos;s input limit were refused (HTTP 400 max_tokens_exceeded), scored as misses and kept in the denominator. The provider reports probabilities to two decimals; exact zeros on many-option items are expected, and Calibration is computed on the reported values without adjustment. Output tokens reported as 0. Measured on the 27 Oct 2026 regular draw, not yet equated to the reference scale (offset 0). This draw has no subject-topic labels yet; use-case and language cells are measured on its own draw. DecisionNode: A first attempt stopped incomplete because of a harness resend bug on our side and is not used; the published result is the second, complete attempt.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.19">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href="/jev-models/v1.7.18">Previous v1.7.18</a></p></header>
 <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256} categories={board.categories} categoriesSha256={release.categoriesSha256} carry={{...release.carry,rows:[]}} carrySha256={release.carrySha256} previousKeys={release.artifact.systems.filter((row: {remeasured_in?: string; new_in?: string})=>row.remeasured_in!=='v1.7.19' && row.new_in!=='v1.7.19').map((row: {key: string})=>row.key)} scope="all" />
 <section className="mt-10 max-w-4xl" data-bh-jev1719-method><h2 className="text-2xl font-bold">What changed in v1.7.19</h2>{notes.map((note,i)=><p className="mt-2" key={i}>{note}</p>)}</section><JevHistoryLazy/></>;
}
