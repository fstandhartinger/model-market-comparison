import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';

// Starts `next start` on a free loopback port for the production-build tests.
// Picking a port by binding :0 and closing it is a check-then-use race: with the
// LeChonk gate lane at --test-concurrency=12 another process can take that port before
// Next binds it, and the test then failed with EADDRINUSE (daily 2026-11-10, port 34057).
// On EADDRINUSE we pick a new port and start again; any other early exit still fails.
// Readiness needs our own server alive and reporting "Ready", so a foreign listener that
// happens to hold the port can never satisfy the probe.
async function freePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

export async function startNextServer(readyPath, { attempts = 5, polls = 100 } = {}) {
  let lastLog = '';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const port = await freePort();
    const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '--hostname', '127.0.0.1'], {
      env: { ...process.env, OPENAI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    server.stdout.on('data', (chunk) => { log += chunk; });
    server.stderr.on('data', (chunk) => { log += chunk; });
    const base = `http://127.0.0.1:${port}`;
    const handle = { base, port, server, log: () => log, stop: () => server.kill('SIGTERM') };
    for (let i = 0; i < polls; i++) {
      if (server.exitCode !== null || server.signalCode !== null) break;
      if (/\bReady\b/.test(log)) {
        try {
          const response = await fetch(`${base}${readyPath}`);
          if (response.ok && server.exitCode === null) return { ...handle, firstResponse: response };
        } catch { /* Wait for Next's listener. */ }
      }
      await pause(200);
    }
    if (server.exitCode === null && server.signalCode === null) {
      // Alive but never answered: not a port race, report it as before.
      return { ...handle, firstResponse: null };
    }
    lastLog = log;
    if (!/EADDRINUSE/.test(log)) throw new Error(`Production server exited: ${log}`);
  }
  throw new Error(`Production server could not bind a free port in ${attempts} attempts: ${lastLog}`);
}
