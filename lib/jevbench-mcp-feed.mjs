import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readJevbenchAgentFeed } from './jevbench-agent-feed.mjs';

/** Reuse the validated, build-time /api/jevbench/latest projection in production. */
export async function readJevbenchMcpFeed(root = process.cwd()) {
  if (process.env.NODE_ENV !== 'production') return (await readJevbenchAgentFeed(root)).feed;
  // Next's force-static route emits this body during `next build`; our Docker image copies the entire .next tree.
  // Read locally: no HTTP request, origin inference, second board assembly, or persistent cache across deployments.
  // A missing/malformed build artifact must fail rather than serve a different or stale projection.
  return JSON.parse(await readFile(path.join(root, '.next/server/app/api/jevbench/latest.body'), 'utf8'));
}
