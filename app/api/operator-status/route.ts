import { NextResponse } from 'next/server';
import { getDataset } from '../../../lib/data';
import { publicOperatorReceipt } from '../../../lib/runtime-status.mjs';
import receipt from '../../../data/operator-receipt.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dataset = await getDataset();
  return NextResponse.json(publicOperatorReceipt(receipt, dataset.sources), {
    headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
  });
}
