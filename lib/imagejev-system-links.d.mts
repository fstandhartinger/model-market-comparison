export type ImageJevDetailVersion = 'v0.2.0' | 'v0.1.5' | 'v0.1.4';
export declare const IMAGE_JEV_DETAIL_VERSIONS: readonly ImageJevDetailVersion[];
export declare function imageJevSystemPath(key: string, revision?: string): string;
export declare function imageJevBoardPath(revision?: string): string;
export declare function imageJevSourceUrl(key: string, repo?: string | null, revision?: string): string | null;
export declare function imageJevAuthorUrl(key: string): string | null;
