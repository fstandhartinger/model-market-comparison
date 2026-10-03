export function projectJevbenchFeed(artifact: import('./jevbench-v15-preview.mjs').JevV15Artifact, artifactSha256: string): Record<string, unknown>;
export function readJevbenchAgentFeed(root?: string): Promise<{ feed: Record<string, unknown>; bytes: string; sha256: string }>;
