import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, handlers } from "../../../../auth";

export const dynamic = "force-dynamic";

const disabled = () => NextResponse.json({ error: "Accounts are not enabled" }, { status: 404, headers: { "Cache-Control": "no-store" } });

export const GET = (req: NextRequest) => (authConfigured() ? handlers.GET(req) : disabled());
export const POST = (req: NextRequest) => (authConfigured() ? handlers.POST(req) : disabled());
