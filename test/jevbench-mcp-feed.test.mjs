import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const moduleUrl = new URL('../lib/jevbench-mcp-feed.mjs', import.meta.url).href;
const readProduction = (root, mode = 'production') => exec(process.execPath, ['--input-type=module', '-e',
  `const { readJevbenchMcpFeed } = await import(${JSON.stringify(moduleUrl)}); console.log(JSON.stringify(await readJevbenchMcpFeed(process.argv[1])));`, root],
  { env: { ...process.env, NODE_ENV: mode, OPENAI_API_KEY: '' } });

test('production MCP reads the static latest body without needing release source files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'jevbench-mcp-feed-'));
  try {
    const dir = path.join(root, '.next/server/app/api/jevbench');
    await mkdir(dir, { recursive: true });
    const feed = { revision: 'fixture', systems: [{ key: 'one', capability: { score: 42 } }] };
    await writeFile(path.join(dir, 'latest.body'), JSON.stringify(feed) + '\n');
    assert.deepEqual(JSON.parse((await readProduction(root)).stdout), feed);
    // Development/test must ignore stale production output and use the source reader.
    await assert.rejects(readProduction(root, 'development'), /ENOENT.*data[\/]/s);
    await writeFile(path.join(dir, 'latest.body'), '{broken');
    await assert.rejects(readProduction(root), /SyntaxError/);
    await rm(path.join(dir, 'latest.body'));
    await assert.rejects(readProduction(root), /ENOENT.*latest.body/s);
  } finally { await rm(root, { recursive: true, force: true }); }
});
