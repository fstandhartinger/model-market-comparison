// CR-173 (frontiercode lane), 2026-09-26: transport shim, loaded with NODE_OPTIONS="--import <this file>" for the lane's
// worker calls only. Kimi K3 (max effort) on the local free router answers a full review packet after more than 300 s,
// and Node's built-in fetch gives up at undici's fixed 300 s headers timeout ("WORKER_ERROR: fetch failed"). For requests
// to the local router (127.0.0.1) this sends the same request over node:http with no header timeout; the worker's own
// AbortSignal (its --timeout) still bounds the call. Nothing else changes: same URL, method, headers, body and response.
import http from 'node:http';
const original = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:') return original(input, init);
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: init.method ?? 'GET', headers: init.headers, signal: init.signal }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
      res.on('error', reject);
    });
    req.setTimeout(0);
    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  });
};
