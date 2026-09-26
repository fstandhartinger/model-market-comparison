// Transport-only preload for this lane's critic calls: Node's built-in fetch (undici) drops a response whose headers
// take longer than 300 s; the free Kimi K3 route (max reasoning, non-streaming) needs longer. Replace the global
// dispatcher with one of the same class without header/body timeouts; AbortSignal.timeout in the worker still bounds it.
try { await fetch('http://127.0.0.1:4010/health', { signal: AbortSignal.timeout(5000) }); } catch {}
const key = Symbol.for('undici.globalDispatcher.2');
const current = globalThis[key];
if (current) globalThis[key] = new current.constructor({ headersTimeout: 0, bodyTimeout: 0 });
else console.error('long-fetch: no global dispatcher found');
