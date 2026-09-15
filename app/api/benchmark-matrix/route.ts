import { getBenchmarkMatrixPage } from "../../../lib/benchmark-matrix-data";
import { matrixForModels } from "../../../lib/benchmark-matrix.mjs";

/** CR-28.1: every benchmark row for up to ten requested models (the start page's shortlist table). */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("models") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const headers = { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" };
  if (!ids.length) return Response.json({ error: "Supply ?models=<id>,<id>,…" }, { status: 400, headers });
  const { matrix } = await getBenchmarkMatrixPage();
  return Response.json({ matrix: matrixForModels(matrix, ids) }, { headers });
}
