import { Agent } from 'undici';

// 2026-10-15 (self-heal): Node's built-in fetch gives up on any response whose headers take longer than 300 s
// (undici's default `headersTimeout`), whatever `AbortSignal.timeout` the caller passed. A non-streamed completion
// sends no headers until the model has finished, so every max-effort Kimi K3 critic call through the local router
// that ran past 300 s died as a bare `fetch failed`: five times in the 02:31 run (each 300-301 s after its start),
// once in the 00:41 run. Two drops exclude the route, it is the only third-family critic, and the `or` second
// opinion then failed "No supported viable worker model found". The router itself allows 900 s. This dispatcher
// lets the worker's own timeout (the AbortSignal) be the only bound on a completion call.
export function completionDispatcher(timeoutSeconds) {
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1) throw new Error('completionDispatcher requires a positive integer timeout');
  const ms = (timeoutSeconds + 5) * 1000;
  return new Agent({ headersTimeout: ms, bodyTimeout: ms });
}
