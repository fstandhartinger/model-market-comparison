import type { JevV14System } from './jevbench-v14.mjs';
import type { JevWeights } from './jevbench-axis-weights.mjs';
import type { JevV15Artifact, JevV15System } from './jevbench-v15-preview.mjs';
import type { JevBoardViewRow } from '../components/JevBoardShared';
import type { JevCompareV15Row } from '../components/JevCompareV15';
import type { JevPreset } from '../components/JevBoardInteractive';

export declare const JEV_V15_AXES: (keyof JevV15System['axes'])[];
export declare function jevV15BoardScore(axes: JevV15System['axes'] | null | undefined, weights: JevWeights): number | null;
export declare function jevV15SliderPresets(artifact: JevV15Artifact): JevPreset[];
export declare function jevV15BoardSystem(row: JevV15System): JevV14System;
export declare function jevV15OpenSource(row: JevV15System): boolean;
export declare function jevV15BoardRow(row: JevV15System, opts?: { isNew?: boolean }): JevBoardViewRow;
export declare function jevV15CompareRow(row: JevV15System): JevCompareV15Row;
