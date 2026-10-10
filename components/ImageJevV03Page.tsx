import { imageJevBoardSystems, imageJevBoardRows, imageJevCompareRows, imageJevCapabilityLimits, imageJevSliderPresets } from '../lib/imagejev-board.mjs';
import { JevCapabilityRanking } from './JevCapabilityRanking';
import { jevClassView } from './jevClassView';
import { JevBubbleCharts } from './JevBubbleChart';
import { JevCapabilityLazy } from './JevCapabilityLazy';
import { JevScoreChart } from './JevBoardInteractive';
import { JevCompareV15 } from './JevCompareV15';
import { ImageJevExamples } from './ImageJevExamples';
import release from '../data/imagejev-v03.json';
import { imageJevSourceUrl, imageJevAuthorLabel } from '../lib/imagejev-system-links.mjs';
import { ImageJevArchiveOpener } from './ImageJevArchiveOpener';
import { MultimodalPreviewContent } from '../app/jev-models/multimodal-preview/page';

export async function ImageJevV03Page() {
 const a: any = release;
 const systems = imageJevBoardSystems(a);
 const limits = imageJevCapabilityLimits(a);
 const options = { limits, factor: limits.factor, referenceLabel: limits.referenceLabel };
 const capability = jevClassView(systems, options);
 const compare = imageJevCompareRows(a);
 const inClass = new Map<string, boolean>(capability.points.map((p: any) => [p.key, !!p.inClass]));
 const m = a.method;
 const rankedCount = a.ranking.filter((r: any) => r.ranked).length;
 const apiRows = a.ranking.filter((r: any) => r.api_flag);
 const selfHostedSealed = a.ranking.find((r: any) => !r.api_flag)?.tracks['computer-use']?.n_sealed;
 return <>
  <ImageJevArchiveOpener />
  <header className="bh-page-head max-w-5xl">
   <p className="bh-eyebrow">Image benchmark · v0.3.0</p>
   <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">ImageJevBench — image decision model benchmark</h1>
   <p className="mt-3 text-lg">ImageJevBench by Benchmark Heaven compares image decision models on accuracy, probability calibration, latency and cost. JevImageBench Capability Score leads within the frozen serving budget.</p>
   <p className="mt-2 bh-muted text-sm" data-bh-imagejev-groups>One board for open-weights models and APIs: API rows carry an <span className="bh-thin-tag bh-flag-tag">API</span> tag, and the API filter above the ranking shows one group. Speed and cost are compared within a group: open-weights models run on the same GPU, API models as sold by each provider.</p>
   <nav className="mt-3 flex flex-wrap gap-3 text-sm" aria-label="ImageJevBench methodology and data"><a className="text-accent underline" href="/jev-models/methodology">Methodology</a><a className="text-accent underline" href="/jev-models/data">Data card & downloads</a><a className="text-accent underline" href="/decision-model-benchmarks">Compare benchmarks</a></nav>
   <p className="mt-2 bh-muted">{a.ranking.length} measured systems · {a.ranking.filter((r: any) => r.ranked).length} accepted for ranking · {a.carried.length} dated carries. Built {String(a.built_utc).slice(0, 10)}.</p>
   <p className="mt-3 bh-muted" data-bh-imagejev-v03-note>New item pool: 2,441 items on 2,160 images, fresh 300 public / 1,200 sealed draw. Measured rows with unresolved acceptance or equating holds remain unrankable. Carried scores belong to v0.1.5 and are not ranked on the v0.3 scale.</p>
   <nav className="mt-3 flex flex-wrap gap-4" aria-label="Image benchmark versions"><a className="text-accent underline" href="#jev-capability">v0.3.0</a><a className="text-accent underline" href="#imagejev-v015-archive">v0.1.5 archive</a><a className="text-accent underline" href="#imagejev-history-heading">Earlier versions</a></nav>
  </header>
  {systems.length > 0 && <>
   <JevCapabilityRanking systems={systems} revision="v0.3.0" officialHref="#jev14-chart-title" benchName="JevImageBench" benchmark="imagejevbench" {...options}
    eligibilityNote={<>Core is the headline. Capability is mean Intelligence and Calibration (0–100). The frozen v0.1.5 envelope remains {limits.factor}× Jev 1.13.0 on JevBench v1.5.4: USD {limits.cost.toFixed(5)} / 1,000 and adjusted p50 ≤ {limits.latency.toFixed(3)} s. Cost and latency traffic lights use this anchor. Only accepted rows inside both caps receive a Capability rank.</>} />
   <JevBubbleCharts points={capability.points} costLimit={limits.cost} latencyCap={limits.latency} referenceName={limits.referenceLabel} benchName="Image JevBench" scoreKind="v15" officialCaps />
   <details className="mt-4"><summary className="cursor-pointer text-accent">Explore capability, cost and speed in 3D</summary><JevCapabilityLazy revision="v0.3.0" systems={systems} classOptions={options} benchName="Image JevBench" only3d /></details>
   <JevScoreChart revision="v0.3.0" benchName="Image JevBench" scoreLabel="Image JevBench composite" costHref="#v03-method" rows={imageJevBoardRows(a)} rankedCount={a.ranking.filter((r: any) => r.ranked).length} newLabel={null} fairness={null} capabilityHref="#jev-capability" presets={imageJevSliderPresets(a)} compactMobile scoreKind="v15" methodLink={{href:'#v03-method',label:'Method notes ↓'}} benchmark="imagejevbench" />
   {compare.length >= 2 ? <JevCompareV15 rows={compare} openDecisions={300} sealedDecisions={1200} axesOnly categories={a.categories} /> : <section className="mt-10" data-bh-v03-compare-pending><h2 className="text-2xl font-semibold">Compare two systems</h2><p className="bh-muted mt-2">Only {compare.length} v0.3 system is measured so far. The interactive two-system comparison becomes available after a second aggregate arrives.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{['Capability radar (four axes)','Capability by image type','Use cases (TypeSafe categories)'].map(title => <div key={title} className="bh-panel p-4"><h3 className="font-semibold">{title}</h3><p className="bh-muted mt-2 text-sm">Awaiting a second measured system{title.includes('categories') || title.includes('type') ? ' and category competence aggregates' : ''}. No scores estimated.</p></div>)}</div></section>}
  </>}
  <section className="bh-panel mt-6 p-4" data-bh-imagejev-reference>
   <h2 className="font-semibold">Jev <span className="bh-thin-tag ml-2">REFERENCE · TypeSafe</span></h2>
   <p className="bh-muted mt-2 text-sm">Jev 1.13.0 defines the Jev-class cost and latency reference. Its <a href="https://docs.typesafe.ai/models" className="text-accent underline" target="_blank" rel="noopener noreferrer">native API accepts text only</a>; image scores and an image radar are unavailable. It is not ranked here. <a href="/jev-models/api?compare=jev-1.13.0,openai-decisions#compare" className="text-accent underline">Compare its measured text results</a>.</p>
  </section>
  <section className="mt-10" data-bh-v03-measured><h2 className="text-2xl font-semibold">Measured on v0.3.0 — core track</h2>
   <div className="mt-4 overflow-x-auto"><table className="bh-table w-full"><thead><tr><th>System</th><th>Rank</th><th>Capability</th><th>Jev-class (within caps)</th><th>Composite</th><th>Status</th><th>Score artifact date</th></tr></thead><tbody>{a.ranking.map((r: any) => { const source = imageJevSourceUrl(r.key, r.repo); return <tr key={r.key} data-bh-v03-measured-row><th className="text-left font-normal">{source ? <a className="text-accent underline" href={source}>{r.name}</a> : r.name}<span className="bh-muted block text-xs">{imageJevAuthorLabel(r)} · {r.licence ?? r.license ?? 'Licence not reported'}{r.params ? ' · '+r.params : ''}</span></th><td>{r.ranked ? '#'+r.rank : '—'}</td><td>{r.tracks.core.capability_raw.toFixed(2)}</td><td>{inClass.get(r.key) ? 'Yes' : 'No'}</td><td>{r.tracks.core.composite.score == null ? '—' : r.tracks.core.composite.score.toFixed(2)}</td><td>{r.ranked ? 'Ranked' : 'Measured but unrankable'}<span className="bh-muted block text-xs">{r.not_ranked_because}</span></td><td>{r.last_measured_utc.slice(0,10)}</td></tr>; })}</tbody></table></div>
   <p className="bh-muted mt-2 text-xs">Capability here is the raw mean of Intelligence and Calibration. Only ranked rows inside the cost and latency caps (Jev-class) receive a Capability rank in the chart above; Rank is the official composite rank.</p>
   <details className="mt-4"><summary className="cursor-pointer text-accent">Per-type, P/S/A and hard-slice aggregates</summary><div className="grid gap-3 mt-3">{a.ranking.map((r: any) => <details key={r.key} className="bh-panel p-3"><summary>{r.name}</summary><pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify({sets:r.tracks.core.sets,per_type:r.tracks.core.per_type,hard_slices:r.tracks.core.hard_slices},null,2)}</pre></details>)}</div></details>
  </section>
  <section className="mt-10" data-bh-v03-computer-use><h2 className="text-2xl font-semibold">Computer-use track</h2><p className="bh-muted mt-2">Separate from the core Capability headline. No mixing of track scores.</p><div className="mt-3 overflow-x-auto"><table className="bh-table"><thead><tr><th>System</th><th>Capability</th><th>Composite</th><th>Public / sealed items</th></tr></thead><tbody>{a.ranking.map((r:any) => {const t=r.tracks['computer-use'];return <tr key={r.key}><th className="text-left font-normal">{r.name}{r.api_flag && <span className="bh-thin-tag ml-1.5" title="Hosted API">API</span>}</th><td>{t?.axes ? t.capability_raw.toFixed(2) : 'Unmeasured'}</td><td>{t?.axes && t.composite.score != null ? t.composite.score.toFixed(2) : '—'}</td><td>{t?.n_public ?? 0} / {t?.n_sealed ?? 0}</td></tr>})}</tbody></table></div>{apiRows.length > 0 && <p className="bh-muted mt-2 text-xs" data-bh-v03-computer-use-api-note>API: {apiRows.map((r: any) => r.name).join(', ')} ran the hosted-API subset ({apiRows[0].tracks['computer-use']?.n_sealed ?? '—'} sealed items instead of {selfHostedSealed ?? '—'}), so its computer-use scores are not comparable with the self-hosted rows.</p>}</section>
  <section className="mt-10" data-bh-v03-carry><h2 className="text-2xl font-semibold">Dated carry — v0.1.5 scores</h2><p className="bh-muted mt-2">Hosted APIs carry their previous score between rotation-eligible refreshes. Unavailable sources and rows not yet measured remain visible. All rows below are carried, not ranked on v0.3 scale.</p><div className="mt-3 overflow-x-auto"><table className="bh-table w-full"><thead><tr><th>System</th><th>Capability (v0.1.5 all track)</th><th>Composite (v0.1.5)</th><th>Last measured / release date</th><th>Status</th></tr></thead><tbody>{a.carried.map((r:any) => <tr key={r.key} data-bh-v03-carry-row><th className="text-left font-normal"><a href={imageJevSourceUrl(r.key, r.repo) ?? '#imagejev-v015-archive'} className="text-accent underline">{r.name}</a></th><td>{((r.tracks.all.axes.intelligence+r.tracks.all.axes.calibration)/2).toFixed(2)}</td><td>{r.tracks.all.composite.score.toFixed(2)}</td><td>{r.last_measured_utc ? r.last_measured_utc.slice(0,10) : 'Unknown; release '+r.release_date.slice(0,10)}</td><td>{r.carry_note}</td></tr>)}</tbody></table></div></section>
  <p className="bh-muted mt-8 text-sm">The examples below are retained v0.1.5 public examples for illustration; they are not v0.3 sealed items.</p>
  <ImageJevExamples />
  <section id="v03-method" className="mt-10 max-w-5xl" data-bh-v03-method><h2 className="text-2xl font-semibold">v0.3.0 method notes</h2>
   <p className="mt-3">The new reserve has 2,441 items: 713 real Hugging Face images/items with CC-BY/MIT provenance and 1,728 synthetic items. The frozen draw has 300 public and 1,200 sealed items; hosted APIs receive the 300-item API subset plus public items. The sealed draw uses 600 choice / 300 Noul / 300 score tasks and a 40% hard share, across 14 families, 14 languages and five use cases.</p>
   <p className="mt-3">{a.method.passes} {a.method.equating_note}</p>
   <p className="mt-3">Each refresh draws fresh items. Items retire after three scored uses; hosted API exposure is at most once per three refresh releases or on a new model version. Exposure is logged before dispatch, items are not reused for that provider, and retire globally after two providers.</p>
   <p className="mt-3">Image-type and TypeSafe use-case radar panels are retained. {a.categories?.dims?.length ? <>Their values are chance-corrected category competence measured on the v0.3.0 draw (categories with fewer than {a.categories.radarMinN} items are listed in a table, not drawn).</> : 'The current score files do not contain category competence aggregates, so their panels state that values are unavailable.'} No v0.1.5 category values or inferred scores are substituted.</p>
   <details className="mt-3"><summary className="cursor-pointer text-accent">Aggregate source receipts and holds</summary><pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify({sources:a.sources,warnings:a.warnings},null,2)}</pre></details>
  </section>
  <section className="mt-10 max-w-5xl" aria-labelledby="imagejev-v03-history-heading" data-bh-imagejev-v03-history>
   <h2 id="imagejev-v03-history-heading" className="text-2xl font-semibold">Revision history</h2>
   <details className="bh-panel mt-3 p-4" open data-bh-imagejev-v03-revision="v0.3.0">
    <summary className="cursor-pointer text-sm leading-relaxed"><b>v0.3.0 · <time dateTime={String(a.built_utc).slice(0, 10)}>{String(a.built_utc).slice(0, 10)}</time></b></summary>
    <ul className="mt-3 list-disc pl-5 text-sm">
     <li>New item pool of {m.reserve.toLocaleString('en-US')} items: {m.real_hf.toLocaleString('en-US')} real and {m.synthetic.toLocaleString('en-US')} synthetic; fresh {m.public} public / {m.sealed.toLocaleString('en-US')} sealed draw.</li>
     <li>{a.ranking.length} measured systems, {rankedCount} ranked; {a.carried.length} dated v0.1.5 carries, not ranked on the v0.3 scale.</li>
     <li>Same-day fix: the lists follow the official rank order.</li>
    </ul>
    <p className="mt-3 text-sm">Earlier revisions (v0.1 to v0.1.5) are in the <a className="text-accent underline" href="#imagejev-history-heading">archive&apos;s revision history</a>.</p>
   </details>
  </section>
  <details id="imagejev-v015-archive" className="mt-10 border-t border-line pt-4" data-bh-v015-archive><summary className="cursor-pointer text-xl font-semibold">v0.1.5 archive — full live page and earlier revision history</summary><MultimodalPreviewContent embedded /></details>
 </>;
}
