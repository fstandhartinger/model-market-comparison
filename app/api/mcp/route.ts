import { readJevbenchAgentFeed } from '../../../lib/jevbench-agent-feed.mjs';
import { createJevbenchTools, handleMcpMessage, MCP_MAX_BODY_BYTES, MCP_PROTOCOL_VERSIONS } from '../../../lib/jevbench-mcp-tools.mjs';

// CR-335 (A34, Florian, 7 Oct 2026): hosted read-only MCP server for the JevBench leaderboard. Streamable HTTP, stateless:
// each POST carries one JSON-RPC message and gets one JSON answer (no sessions, no event stream, no auth). The tools
// read the same release projection as /api/jevbench/latest from the deployed files; nothing is written or fetched.
export const dynamic = 'force-dynamic';

// The release only changes with a deploy, so one parsed feed per process is enough.
let feed: Promise<unknown> | null = null;
const getFeed = () => (feed ??= readJevbenchAgentFeed().then((r) => r.feed).catch((e) => { feed = null; throw e; }));
const tools = createJevbenchTools(getFeed);

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const rpcError = (code: number, message: string, status = 400) => json({ jsonrpc: '2.0', id: null, error: { code, message } }, status);

export async function POST(req: Request) {
  const version = req.headers.get('mcp-protocol-version');
  if (version && !MCP_PROTOCOL_VERSIONS.includes(version)) return rpcError(-32600, `Unsupported MCP-Protocol-Version; supported: ${MCP_PROTOCOL_VERSIONS.join(', ')}`);
  if (Number(req.headers.get('content-length') ?? 0) > MCP_MAX_BODY_BYTES) return rpcError(-32600, 'Request body too large', 413);
  const text = await req.text();
  if (Buffer.byteLength(text) > MCP_MAX_BODY_BYTES) return rpcError(-32600, 'Request body too large', 413);
  let msg: unknown;
  try { msg = JSON.parse(text); } catch { return rpcError(-32700, 'Parse error'); }
  if (Array.isArray(msg)) return rpcError(-32600, 'JSON-RPC batches are not supported; send one message per request');
  const answer = await handleMcpMessage(msg, tools);
  return answer ? json(answer) : new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}

// No server-initiated stream (spec: answer GET with 405) and no sessions to delete.
const notAllowed = () => json({ error: 'Use POST with a JSON-RPC message. Docs: https://benchmarkheaven.com/llms.txt' }, 405, { Allow: 'POST, OPTIONS' });
export const GET = notAllowed;
export const DELETE = notAllowed;
