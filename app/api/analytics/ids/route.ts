import { NextResponse } from "next/server";
import { getDataset } from "../../../../lib/data";
import { readJevbenchV12, jevbenchV12View } from "../../../../lib/jevbench-v12.mjs";
import { readJevbenchV141 } from "../../../../lib/jevbench-v141.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const [dataset, jev12, jevbench] = await Promise.all([getDataset(), readJevbenchV12(), readJevbenchV141()]);
  const v12 = jevbenchV12View(jev12);
  return NextResponse.json({
    models: dataset.models.map((model) => model.id),
    modelFamilies: [...new Set(dataset.models.map((model) => model.family_key))],
    jevSystems: [...new Set([
      ...v12.ranked.map((system) => system.key),
      ...v12.honorable.map((system) => system.key),
      ...v12.partial.map((system) => system.key),
      ...jevbench.artifact.systems.map((system) => system.key),
    ])],
  }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
