/** CR-35.4 (Florian 2026-09-15): Epoch AI's data "is free to use, distribute, and reproduce provided the source and
 *  authors are credited under the Creative Commons Attribution license" (epoch.ai/benchmarks/eci). */
export const EPOCH_ECI_URL = "https://epoch.ai/eci";
export const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";
/** `bare` drops the "Data:" prefix where it directly follows another credit (CR-63.12: "Data: Artificial Analysis · Epoch AI (CC BY)"). */
export function EpochCredit({ className = "", bare = false }: { className?: string; bare?: boolean }) {
  return <span className={`bh-aa-credit ${className}`} data-epoch-credit>
    {bare ? null : "Data: "}<a href={EPOCH_ECI_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-accent">Epoch AI</a>{" "}
    (<a href={CC_BY_URL} target="_blank" rel="noopener noreferrer license" className="underline decoration-dotted underline-offset-2 hover:text-accent">CC BY</a>)
  </span>;
}
