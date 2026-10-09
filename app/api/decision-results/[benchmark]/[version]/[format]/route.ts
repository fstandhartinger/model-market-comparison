import { decisionResultResponse } from '../../../../../../lib/decision-result-export.mjs';

export async function GET(_request: Request, { params }: { params: Promise<{ benchmark: string; version: string; format: string }> }) {
  const { benchmark, version, format } = await params;
  return decisionResultResponse(benchmark, version, format);
}
