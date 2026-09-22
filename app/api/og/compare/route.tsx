import { ImageResponse } from 'next/og';
import { resolveCompareRequest } from '../../../../lib/compare-meta';

// CR-122: the link-preview image of a shared comparison. It names every model in the URL and shows the
// AA Intelligence Index for those that have one; a model that is not measured yet says exactly that.
const SIZE = { width: 1200, height: 630 };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { entries } = await resolveCompareRequest(url.searchParams);
  const shown = entries.slice(0, 3);
  const columnWidth = shown.length ? `${Math.floor(100 / shown.length)}%` : '100%';
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '54px 62px', background: '#07111f', color: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6ee7b7', fontSize: 25, fontWeight: 700, letterSpacing: 1.2 }}>
        <span>BENCHMARK HEAVEN</span><span>MODEL COMPARISON</span>
      </div>
      <div style={{ display: 'flex', fontSize: shown.length > 2 ? 44 : 53, fontWeight: 800, marginTop: 24, lineHeight: 1.05 }}>
        {shown.map((entry) => entry.name).join('  vs  ') || 'Compare AI models'}
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 34 }}>
        {shown.map((entry) => (
          <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', width: columnWidth, borderRadius: 14, padding: '22px 24px', background: '#101e30', border: entry.kind === 'pending' ? '2px dashed #4b5f77' : '1px solid #24364c' }}>
            <span style={{ fontSize: 21, color: '#8fa2b8' }}>{entry.org ?? 'Model'}</span>
            <span style={{ fontSize: 31, fontWeight: 700, marginTop: 6 }}>{entry.name}</span>
            {entry.kind === 'known' && typeof entry.score === 'number'
              ? <span style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#6ee7b7', marginTop: 14 }}>{entry.score.toFixed(1)}<span style={{ fontSize: 19, color: '#8fa2b8', marginLeft: 10, marginTop: 16 }}>AA Intelligence Index</span></span>
              : <span style={{ display: 'flex', fontSize: 25, fontWeight: 700, color: '#f6c177', marginTop: 16 }}>{entry.kind === 'pending' ? 'Coming soon' : 'No index value yet'}</span>}
            {entry.kind === 'pending' && <span style={{ fontSize: 18, color: '#8fa2b8', marginTop: 10 }}>Numbers land here as soon as they are published</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 'auto', fontSize: 22, color: '#a9b8ca' }}>Every benchmark with a published result · every value with its source · the actual cost per task</div>
    </div>,
    { ...SIZE, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
