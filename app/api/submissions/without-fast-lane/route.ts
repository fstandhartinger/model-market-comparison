import { NextResponse, type NextRequest } from 'next/server';
import { isJsonRequest, sameOrigin } from '../../../../lib/account-sync.mjs';
import { queuePosition, submissionForPage, withoutFastLane } from '../../../../lib/model-submission-db';
import { submissionReference } from '../../../../lib/model-submission.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** The client's submission UUID is the capability. Moves an unpaid fast-lane submission to the regular queue. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers) || !isJsonRequest(req.headers)) return json({ error: 'Forbidden' }, 403);
  if (!process.env.ACCOUNTS_DATABASE_URL) return json({ error: 'Submissions are not available right now. Please try again later.' }, 503);
  const raw = await req.text();
  if (raw.length > 1_000) return json({ error: 'Request is too large.' }, 413);
  let id: unknown;
  try { id = (JSON.parse(raw) as { submissionId?: unknown }).submissionId; } catch { return json({ error: 'Invalid request.' }, 400); }
  if (typeof id !== 'string') return json({ error: 'Invalid request.' }, 400);
  try {
    const outcome = await withoutFastLane(id);
    if (outcome === 'not_found') return json({ error: 'We could not find that submission.' }, 404);
    if (outcome === 'paid') return json({ error: 'This submission was already paid for and is in the fast lane.' }, 409);
    const row = await submissionForPage(id);
    return json({ ok: true, reference: submissionReference(id), queuePosition: row ? await queuePosition(row.id) : null });
  } catch (err) {
    console.error('model_submission_without_fast_lane_failed', err instanceof Error ? err.name : 'unknown');
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
