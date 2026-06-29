import { NextResponse } from "next/server";
import { getDataset } from "../../../lib/data";

export const dynamic = "force-dynamic";

/** Full read-only export of the whole dataset (models + offers + benchmarks +
 *  providers + source dates) — the canonical machine-readable feed of this app. */
export async function GET() {
  const ds = await getDataset();
  return NextResponse.json(ds, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
  });
}
