export interface ParetoPoint {
  x: number;
  y: number;
  id?: string;
}

export function paretoFrontier<T extends ParetoPoint>(points: readonly T[]): T[];
