/** Return systems with both published axes, sorted by arithmetic mean of Intelligence and Calibration. */
export function jevbenchCapabilityRows(systems) {
  return systems
    .flatMap((row) => {
      const intelligence = row?.axes?.intelligence;
      const calibration = row?.axes?.calibration;
      if (!Number.isFinite(intelligence) || !Number.isFinite(calibration)) return [];
      return [{ row, capability: (intelligence + calibration) / 2 }];
    })
    .sort((a, b) => b.capability - a.capability
      || a.row.display.localeCompare(b.row.display)
      || a.row.key.localeCompare(b.row.key));
}
