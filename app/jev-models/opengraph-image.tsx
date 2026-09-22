import { ImageResponse } from 'next/og';
import { readJevbenchV12, jevbenchV12View } from '../../lib/jevbench-v12.mjs';

export const alt = 'Top of the current JevBench leaderboard';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const short = (name: string) => name.split(' (')[0].split(', formerly')[0];

export default async function Image() {
  const view = jevbenchV12View(await readJevbenchV12());
  const all = [...view.ranked, ...view.honorable, ...view.partial];
  const date = new Date(view.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '54px 62px', background: '#07111f', color: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6ee7b7', fontSize: 25, fontWeight: 700, letterSpacing: 1.2 }}>
        <span>BENCHMARK HEAVEN</span><span>JevBench {view.revision} · {date}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 26 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 53, lineHeight: 1.05, fontWeight: 800 }}>Jev alternatives, ranked</div>
          <div style={{ display: 'flex', marginTop: 12, color: '#a9b8ca', fontSize: 25 }}>{all.length} systems · {view.decisions} decisions · measured, not self-reported</div>
        </div>
        <div style={{ display: 'flex', color: '#a9b8ca', fontSize: 20 }}>JevBench Score</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {view.ranked.slice(0, 5).map((row, index) => (
          <div key={row.key} style={{ display: 'flex', alignItems: 'center', height: 62, borderRadius: 12, padding: '0 20px', background: index === 0 ? '#12382f' : '#101e30', border: index === 0 ? '2px solid #34d399' : '1px solid #24364c' }}>
            <span style={{ width: 55, color: index === 0 ? '#6ee7b7' : '#8fa2b8', fontSize: 25, fontWeight: 800 }}>#{row.rank}</span>
            <span style={{ flex: 1, fontSize: 27, fontWeight: 700 }}>{short(row.display)}</span>
            <span style={{ fontSize: 31, fontWeight: 800, color: index === 0 ? '#6ee7b7' : '#f8fafc' }}>{row.main.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
