/** CR-35.1 (Florian 2026-09-15): Artificial Analysis requires attribution for all use of its free API
 *  ("Please provide attribution to https://artificialanalysis.ai/"). Shown next to every AA-derived value. */
export function AaCredit({ className = "" }: { className?: string }) {
  return <span className={`bh-aa-credit ${className}`} data-aa-credit>
    Data: <a href="https://artificialanalysis.ai/" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-accent">Artificial Analysis</a>
  </span>;
}
