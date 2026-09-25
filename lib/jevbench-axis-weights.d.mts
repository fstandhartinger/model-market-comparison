export type JevAxis = 'intelligence' | 'calibration' | 'speed' | 'cost';
export type JevWeights = Record<JevAxis, number>;
export declare const JEV_AXES: JevAxis[];
export declare const OFFICIAL_WEIGHTS: JevWeights;
export declare function isOfficialWeights(weights: JevWeights): boolean;
export declare function weightedJevScore(axes: Partial<Record<JevAxis, number | null>> | null | undefined, weights: JevWeights): number | null;
