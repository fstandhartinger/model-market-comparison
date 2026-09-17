export interface ParetoPoint {
  x: number;
  y: number;
  id?: string;
}

/** CR-77.3: `grace` is a tolerance on the capability axis — a point survives unless a point at the same cost or
 *  cheaper beats it by at least that much. 0 (default) is the strict Pareto rule. */
export function paretoFrontier<T extends ParetoPoint>(points: readonly T[], options?: { grace?: number }): T[];
