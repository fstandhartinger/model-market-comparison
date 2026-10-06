"use client";

import { JevCapability3D } from './JevCapability3D';
import { useJevV15VisibleKeys } from './useJevV15VisibleKeys';

type Props = Parameters<typeof JevCapability3D>[0];

// Review 6 Oct 2026: the 3D view ignored the page filters ("Show API offerings" off still plotted the API rows and the
// caption counted them). It now plots the same visible set as the 2D charts and the table.
export function JevCapability3DVisible({ points, costBounds, benchmarkName }: Props) {
  const visibleKeys = useJevV15VisibleKeys(points.map((point) => point.key));
  const shown = points.filter((point) => visibleKeys.has(point.key));
  return <>
    <div className="bh-panel mt-4 p-4 sm:p-5"><JevCapability3D points={shown} costBounds={costBounds} benchmarkName={benchmarkName} /></div>
    <p className="bh-muted mt-2 text-xs">{shown.length} systems plotted; systems missing cost or Speed are omitted.</p>
  </>;
}
