export interface ImageJevV04Row {
  id: string;
  name: string;
  n: number;
  measured_utc: string;
  intelligence: number;
  calibration: number;
  composite: number;
  latency_p50_s: number;
  usd_per_1000: number;
}
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
