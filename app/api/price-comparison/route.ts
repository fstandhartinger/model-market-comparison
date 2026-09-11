import { getDataset } from '../../../lib/data';
import { clientData } from '../../../lib/client-model';
export async function GET() {
  return Response.json(clientData(await getDataset()), { headers: { 'Cache-Control': 'public, max-age=300' } });
}
