import { readJevbenchV12, jevbenchV12View } from '../../../../../lib/jevbench-v12.mjs';
import { jevbenchV12HeldoutView } from '../../../../../lib/jevbench-v12-heldout.mjs';
import { readJevbenchV12Tasks, jevbenchV12TasksView } from '../../../../../lib/jevbench-v12-tasks.mjs';
import { readJevbenchV12Topics, jevbenchV12TopicsView } from '../../../../../lib/jevbench-v12-topics.mjs';

// F-179 / CR-144: the current board keeps its historical v1.3 disclosure closed by default.
// Serve the public-only historical payload separately so opening the disclosure can fetch it
// without putting the tables, task grid, or diagnostics in the initial page HTML.
export const dynamic = 'force-static';

export async function GET() {
  const v12 = await readJevbenchV12();
  const view = jevbenchV12View(v12);
  const topics = jevbenchV12TopicsView(await readJevbenchV12Topics(v12.artifact));
  const taskData = await readJevbenchV12Tasks(v12);
  return Response.json({
    view,
    topics,
    tasks: jevbenchV12TasksView(taskData),
    heldout: jevbenchV12HeldoutView(taskData.artifact),
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
