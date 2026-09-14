import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "../../../auth";
import { deleteAccount, loadAccount, saveAccountData } from "../../../lib/accounts-db";
import { isJsonRequest, MAX_BODY_CHARS, parseAccountPatch, sameOrigin } from "../../../lib/account-sync.mjs";
import { sanitizeStore } from "../../../lib/presets.mjs";

// CR-5.2 / CR-5.5: the signed-in user's presets and settings; DELETE removes the account and its data.
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function userId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: unknown } | undefined)?.id;
  return typeof id === "string" ? id : null;
}

export async function GET() {
  if (!authConfigured()) return json({ enabled: false, user: null });
  const id = await userId();
  const row = id ? await loadAccount(id) : null;
  if (!id || !row) return json({ enabled: true, user: null });
  return json({
    enabled: true,
    user: { email: row.email, name: row.name, image: row.image, id },
    presets: sanitizeStore(row.presets),
    settings: row.settings ?? null,
    updatedAt: row.updated_at,
  });
}

export async function PUT(req: NextRequest) {
  if (!authConfigured()) return json({ error: "Accounts are not enabled" }, 404);
  if (!sameOrigin(req.headers) || !isJsonRequest(req.headers)) return json({ error: "Forbidden" }, 403);
  const id = await userId();
  if (!id) return json({ error: "Not signed in" }, 401);
  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) return json({ error: "Too large" }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json({ error: "Invalid JSON" }, 400); }
  const patch = parseAccountPatch(body);
  if (!patch) return json({ error: "Invalid payload" }, 400);
  return (await saveAccountData(id, patch)) ? json({ ok: true }) : json({ error: "Account not found" }, 401);
}

export async function DELETE(req: NextRequest) {
  if (!authConfigured()) return json({ error: "Accounts are not enabled" }, 404);
  if (!sameOrigin(req.headers)) return json({ error: "Forbidden" }, 403);
  const id = await userId();
  if (!id) return json({ error: "Not signed in" }, 401);
  await deleteAccount(id);
  return json({ ok: true });
}
