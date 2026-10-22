import { notFound } from 'next/navigation';
import { readJevbenchV170ForBoard } from '../../../lib/jevbench-v170-release.mjs';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevV170OldNewTable } from '../../../components/JevV170OldNewTable';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
export const metadata = {title: 'JevBench v1.7.0 · 10-second limit per decision, every row re-scored', alternates:{canonical:'/jev-models/v1.7.0'}};
type Row = { key: string; display: string; method: string; ranked: boolean; rank: number | null; listing: string; scores?: { A: number }; capability?: number; axes: { speed: number };
  speed?: { p50_s_raw: number; p95_s_raw: number }; decision_limit: { n_over_limit: number; speed_n: number } | null;
  previous: { board_release: string; scores: { A: number } | null; capability: number | null; rank: number | null } };
export default async function JevModelsV170Page() {
 const release = await readJevbenchV170ForBoard(); if (!release) notFound();
 const carry = release.carry as unknown as { label: string; rows: unknown[] };
 const artifact = release.artifact as unknown as { systems: Row[]; measurement_notes: string[]; n_ranked: number; restates: { board_release: string } };
 return <><JevBenchReleaseVersionNav active="v1.7.0" />
 <header className="bh-page-head" data-bh-jev16-release-header><div className="bh-eyebrow">JevBench v1.7.0 · method v1.7 (10 s rule)</div>
 <h1 className="mt-1 text-3xl font-bold">A 10-second limit per decision; every row re-scored</h1>
 <p className="mt-3 max-w-3xl">From v1.7.0 a decision that takes longer than 10 seconds counts as a wrong answer and as zero calibration for that item. Every row of the previous board is re-scored from its recorded per-decision times; no model was run again for the re-scored rows. The values of the previous release stay visible next to the new ones. 12 rows were measured for the first time under the rule (new in v1.7.0) and carry no previous values. 3 earlier CPU rows were measured again on the same items on a GPU; the GPU row replaces the CPU row in full (scores and times) and the CPU values stay visible as its previous values.</p>
 <p className="bh-muted mt-2 text-xs break-all"><a href="/api/jevbench/v1.7.0">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a href={`/jev-models/${artifact.restates.board_release}`}>Previous {artifact.restates.board_release}</a></p></header>
 <section className="mt-10 max-w-4xl" data-bh-jev170-method><h2 className="text-2xl font-bold">What changed in v1.7.0</h2>
 {artifact.measurement_notes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</section>
 <JevV170OldNewTable systems={artifact.systems as never} carryRows={carry.rows as never} carryLabel={carry.label} previousRelease={artifact.restates.board_release} />
 <JevHistoryLazy /></>;
}
