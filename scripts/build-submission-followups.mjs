// Extract the selector from this successful Next build's validated static feed; never replay the release chain on requests.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function submissionFollowupSnapshot({ feed, sha256 }) {
  if (!/^[a-f0-9]{64}$/.test(sha256 ?? '') || feed?.schema_version !== 2 || feed.benchmark !== 'JevBench' || !Array.isArray(feed.systems)) throw new Error('Missing validated live board');
  const systems = feed.systems
    .filter((s) => s.ranked === true && Number.isInteger(s.rank) && s.rank >= 1)
    .map(({ key, name, rank }) => ({ key, display: name, rank, ranked: true }));
  if (!systems.length || systems.some((s) => typeof s.key !== 'string' || !s.key || typeof s.display !== 'string' || !s.display)
    || new Set(systems.map((s) => s.key)).size !== systems.length) throw new Error('Invalid ranked follow-up rows');
  return { schema_version: 1, feed_sha256: sha256, systems };
}

export async function buildSubmissionFollowups(root = process.cwd()) {
  // Next 15 emits force-static route responses here. Missing/changed output fails the build.
  const bytes = await readFile(path.join(root, '.next/server/app/api/jevbench/latest.body'));
  const snapshot = submissionFollowupSnapshot({ feed: JSON.parse(bytes), sha256: createHash('sha256').update(bytes).digest('hex') });
  const output = path.join(root, 'data/submission-jevbench-followups.json');
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot) + '\n');
  await rename(temporary, output);
  console.log(`Submission follow-ups: ${snapshot.systems.length} current ranked JevBench rows`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await buildSubmissionFollowups();
