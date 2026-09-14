import { NextResponse } from "next/server";
import { authConfigured } from "../../../auth";
import { accountsReachable } from "../../../lib/accounts-db";
export const dynamic = "force-dynamic";
export async function GET() {
  // `accounts`: CR-5 sign-in is configured and its database answers (false while not provisioned).
  const accounts = authConfigured() ? await accountsReachable() : false;
  return NextResponse.json({ ok: true, db: !!process.env.DATABASE_URL, accounts });
}
