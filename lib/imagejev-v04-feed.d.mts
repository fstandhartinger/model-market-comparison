export interface ImageJevV04Cell {
  id: string;
  label: string;
  n: number;
  correct: number;
  chance: number;
}
export interface ImageJevV04Row {
  id: string;
  name: string;
  n: number;
  measured_utc: string;
  intelligence: number;
  calibration: number;
  composite: number | null;
  latency_p50_s: number | null;
  usd_per_1000: number;
  breakdowns: { use_case: ImageJevV04Cell[] | null; image_type: ImageJevV04Cell[] | null };
}
export declare const IMAGEJEV_V04_MIN_CELL_N: 30;
export interface ImageJevV04Feed {
  schema_version: 1;
  benchmark: 'ImageJevBench';
  scale: 'v0.4';
  revision: string;
  data_kind: 'fixture' | 'measured';
  built_utc: string;
  items: number;
  method_disclosure: string | null;
  rows: ImageJevV04Row[];
}
export declare function validateImageJevV04Feed(value: unknown): ImageJevV04Feed | null;
export declare function loadImageJevV04Feed(readText: () => Promise<string>, options?: { allowFixture?: boolean }): Promise<ImageJevV04Feed | null>;
