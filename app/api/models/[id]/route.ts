import { NextResponse } from "next/server";
import { getDataset, cheapestOffers } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = await getDataset();
  const model = ds.models.find((m) => m.id === id || m.family_key === id);
  if (!model) return NextResponse.json({ error: "not found" }, { status: 404 });
  // sibling variants of the same family (e.g. GPT-5.5 low/medium/high/xhigh)
  const variants = ds.models.filter((m) => m.family_key === model.family_key);
  return NextResponse.json({
    model,
    variants: variants.map((v) => ({ id: v.id, variant: v.variant, display_name: v.display_name, benchmarks: v.benchmarks })),
    cheapest: cheapestOffers(model, 5),
  });
}
