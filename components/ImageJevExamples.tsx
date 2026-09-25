import Image from 'next/image';
import { PUBLIC_IMAGE_JEV_EXAMPLES } from '../lib/image-jev-public-examples.mjs';

export function ImageJevExamples() {
  return <section className="mt-10 max-w-6xl" aria-labelledby="image-jev-examples-heading" data-bh-mm-examples>
    <h2 id="image-jev-examples-heading" className="text-2xl font-semibold">Examples from public items</h2>
    <p className="bh-muted mt-2 max-w-5xl text-sm">These eight examples are from the public split. Each card shows the image, question, options and correct answer; licensed sources are credited below their image.</p>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {PUBLIC_IMAGE_JEV_EXAMPLES.map((example) => {
        const correct = example.options.find((option) => option.label === example.correctLabel);
        return <article key={example.key} className="bh-panel overflow-hidden" data-bh-mm-example={example.sourceItemId} aria-labelledby={'image-jev-example-' + example.key}>
          <div className="flex h-56 items-center justify-center bg-black/5 p-3 dark:bg-white/5 sm:h-64">
            <Image
              src={example.image}
              width={example.width}
              height={example.height}
              alt={example.alt}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="p-4 sm:p-5">
            <p className="bh-eyebrow">{example.category}</p>
            <h3 id={'image-jev-example-' + example.key} className="mt-1 text-lg font-semibold">{example.title}</h3>
            <p className="mt-3 text-sm"><b>Question:</b> {example.question}</p>
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2" aria-label={'Options for ' + example.title}>
              {example.options.map((option) => {
                const isCorrect = option.label === example.correctLabel;
                return <li key={option.label} className={'rounded-lg border px-3 py-2 ' + (isCorrect ? 'border-emerald-600 bg-emerald-950/15 dark:border-emerald-500' : 'border-line')}>
                  <span className="font-semibold">{option.label}.</span> {option.text}
                  {isCorrect && <span className="ml-2 inline-block rounded-full border border-emerald-700 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-800 dark:border-emerald-400 dark:text-emerald-300">Correct</span>}
                </li>;
              })}
            </ul>
            <p className="mt-3 text-sm"><b>Correct answer:</b> {correct?.label}. {correct?.text}</p>
            <p className="bh-muted mt-3 border-t border-line pt-3 text-xs">
              {example.sourceUrl
                ? <>Source: <a href={example.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">{example.sourceName}</a> · {example.license} · {example.sourceRevision?.slice(0, 12)} · public item {example.sourceItemId}</>
                : <>Source: {example.sourceName} · public item {example.sourceItemId}</>}
              {example.licenseLinks?.length ? <> · Licence text: {example.licenseLinks.map((link, index) => <span key={link.url}>{index > 0 && ', '}<a href={link.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">{link.label}</a></span>)}</> : null}
              {example.changeNote && <span className="mt-1 block" data-bh-mm-example-change>{example.changeNote}</span>}
            </p>
          </div>
        </article>;
      })}
    </div>
    <p className="bh-muted mt-4 max-w-5xl text-xs" data-bh-mm-example-credits>Screenshot images are adapted from the credited datasets (labelled markers added); the FinQA table is re-rendered by ImageJevBench. Licences: <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="text-accent underline">Apache-2.0</a> (ScreenSpot), <a href="https://opensource.org/license/mit" target="_blank" rel="noopener noreferrer" className="text-accent underline">MIT</a> (ScreenSpot-Pro, Geometry3K, FinQA annotations), <a href="https://cdla.dev/permissive-1-0/" target="_blank" rel="noopener noreferrer" className="text-accent underline">CDLA-Permissive-1.0</a> (FinTabNet table data). App and website content shown in screenshots belongs to its respective owners. No Mind2Web or Android-in-the-Wild image is shown.</p>
  </section>;
}
