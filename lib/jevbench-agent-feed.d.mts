export function projectJevbenchFeed(artifact: import('./jevbench-v15-preview.mjs').JevV15Artifact | import('./jevbench-v16-release.mjs').JevV16ReleaseArtifact, artifactSha256: string): Record<string, unknown>;
export function readJevbenchAgentFeed(root?: string): Promise<{ feed: Record<string, unknown>; bytes: string; sha256: string }>;
