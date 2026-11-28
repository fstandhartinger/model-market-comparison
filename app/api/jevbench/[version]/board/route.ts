import { JEV_LEGACY_ARCHIVE_VERSIONS, readJevLegacyArchivePayload } from '../../../../../lib/jevbench-archive-legacy-input.mjs';
import { jevClassView } from '../../../../../components/jevClassView';
import { JEV_ARCHIVE_BOARD_VERSIONS, readJevArchiveBoardProps } from '../../../../../lib/jevbench-archive-board-input.mjs';
import { jevArchiveComparisonCategories } from '../../../../../lib/jevbench-archive-board-view.mjs';

export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() {
  return [...JEV_ARCHIVE_BOARD_VERSIONS, ...JEV_LEGACY_ARCHIVE_VERSIONS].map(version => ({ version }));
}
export async function GET(_request: Request, { params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const legacy = JEV_LEGACY_ARCHIVE_VERSIONS.includes(version) ? await readJevLegacyArchivePayload(version, process.cwd(), jevClassView) : null;
  if (legacy) return Response.json({ ...legacy, widgets: {
    ...legacy.widgets, board: { component: legacy.widgets.board.component },
  } }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  const props = await readJevArchiveBoardProps(version);
  if (!props) return new Response('Not found', { status: 404 });
  // Original props remain intact. The separate projection preserves validated WeakMap-backed category bounds after JSON.
  return Response.json({ props, comparisonCategories: jevArchiveComparisonCategories(props) }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
