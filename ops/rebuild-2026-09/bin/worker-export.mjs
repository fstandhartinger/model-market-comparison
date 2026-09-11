import { spawn } from 'node:child_process';
import { mkdtemp, open, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Opencode's export command can exit before flushing a large stdout pipe.
// A regular file receives its synchronous write in full; still bound size/time.
export async function exportSession(binary, sessionID, cwd) {
  const dir = await mkdtemp(join(tmpdir(), 'bh-worker-export-'));
  const path = join(dir, 'session.json');
  const output = await open(path, 'wx', 0o600);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(binary, ['export', sessionID], { cwd, stdio: ['ignore', output.fd, 'ignore'] });
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Opencode export timed out')); }, 30_000);
      child.on('error', (e) => { clearTimeout(timer); reject(e); });
      child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Opencode export exit ${code}`)); });
    });
    if ((await stat(path)).size > 4_000_000) throw new Error('Opencode export exceeds 4MB bound');
    return JSON.parse(await readFile(path, 'utf8'));
  } finally { await output.close(); await rm(dir, { recursive: true, force: true }); }
}
