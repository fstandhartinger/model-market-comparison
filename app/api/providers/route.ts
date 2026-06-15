import { NextResponse } from "next/server";
import { getDataset } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const ds = await getDataset();
  return NextResponse.json({ count: ds.providers.length, providers: ds.providers });
}
