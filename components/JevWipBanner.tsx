// CR-88 (Florian 2026-09-19): JevBench is being reworked (v1.2, a much harder tier). Until it is finished the page stays
// reachable but unlisted (not in the menu or sitemap, noindex) and carries this banner. Remove both when v1.2 ships.
export const JEV_WIP_ROBOTS = { index: false, follow: false } as const;

export function JevWipBanner() {
  return <div role="alert" data-bh-jev-wip className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-400/15 px-5 py-4 text-amber-100">
    <p className="text-2xl font-extrabold tracking-tight text-amber-300">⚠ Work in progress</p>
    <p className="mt-1 text-base font-semibold">Results are preliminary — please don&apos;t share or cite them yet.</p>
    <p className="mt-1 text-sm">We are adding a much harder task tier and a calibration score (JevBench v1.2). Rankings on this page will change.</p>
  </div>;
}
