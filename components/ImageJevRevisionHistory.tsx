import {
  readArchivedMultimodalPreviewV011, readArchivedMultimodalPreviewV012, readArchivedMultimodalPreviewV013, readArchivedMultimodalPreviewV014,
} from '../lib/jevbench-multimodal-preview.mjs';

const changes: Record<string, string> = {
  'v0.1.1': 'Expanded the clean public/sealed split to 48 measured systems; kept the frozen scoring method.',
  'v0.1.2': 'Added Imajev-4B (49 systems), initially #11 in the composite ranking.',
  'v0.1.3': 'Re-measured Imajev-4B with fast serving; it moved to #1. Other systems and the split stayed frozen.',
  'v0.1.4': 'Added Wity-1 (50 systems), priced at the Qwen3.6-35B-A3B base-model reference; its build remains under author review.',
  'v0.1.5': 'Ranked Wity-1 at its stated API tariff, kept a base-model price alternative, and froze the JevBench cost/latency envelope for the Capability Score.',
};

export async function ImageJevRevisionHistory({ current }: { current: any }) {
  const archived = await Promise.all([
    readArchivedMultimodalPreviewV011(), readArchivedMultimodalPreviewV012(), readArchivedMultimodalPreviewV013(), readArchivedMultimodalPreviewV014(),
  ]);
  const revisions = [...archived.map(({ artifact }) => artifact), current];
  return <section className="mt-10 max-w-6xl" aria-labelledby="imagejev-history-heading" data-bh-mm-revision-history>
    <h2 id="imagejev-history-heading" className="text-2xl font-semibold">Revision history</h2>
    <p className="bh-muted mt-2 text-sm">These are composite rankings at each revision, read from its frozen aggregate artifact. The Capability Score became the headline in v0.1.5. Earlier split scores are not directly comparable with the current split.</p>
    <details className="bh-panel mt-3 p-4" data-bh-mm-revision="v0.1">
      <summary className="cursor-pointer font-semibold">v0.1 · 25 Sep 2026 clean-split revision</summary>
      <p className="bh-muted mt-3 text-sm">The original preview established the scoring method; the 25 Sep clean-split revision corrected exposure and added fresh sealed items. No frozen v0.1 ranking copy is retained in this repository, so its top three and full composite ranking cannot be reconstructed here.</p>
    </details>
    {revisions.map((a: any) => {
      const rows = [...a.ranking].sort((x, y) => y.tracks.all.composite.score - x.tracks.all.composite.score);
      return <details key={a.revision} className="bh-panel mt-3 p-4" data-bh-mm-revision={a.revision}>
        <summary className="cursor-pointer text-sm leading-relaxed">
          <b>{a.revision} · <time dateTime={a.built_utc.slice(0, 10)}>{a.built_utc.slice(0, 10)}</time></b>
          <span className="bh-muted mt-1 block">{changes[a.revision]}</span>
          <span className="mt-1 block">Top three: {rows.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} (${r.tracks.all.composite.score.toFixed(2)})`).join(' · ')}</span>
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label={`${a.revision} frozen composite ranking`} data-bh-mm-history-ranking={a.revision}>
            <thead><tr><th className="p-2">#</th><th className="p-2">System</th><th className="p-2 text-right">Composite</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={r.key} className="border-t border-line"><td className="p-2 tabular-nums">{i + 1}</td><th scope="row" className="p-2 font-normal">{r.name}</th><td className="p-2 text-right tabular-nums">{r.tracks.all.composite.score.toFixed(2)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>;
    })}
  </section>;
}
