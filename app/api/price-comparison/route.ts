import { getDataset } from '../../../lib/data';
import { clientData } from '../../../lib/client-model';
import { compositeBenchmaxxingSignals } from '../../../lib/composite-signals';
export async function GET() {
  return Response.json(clientData(await getDataset(), {}, await compositeBenchmaxxingSignals()), // CR-74.4
    { headers: { 'Cache-Control': 'public, max-age=300' } });
}
