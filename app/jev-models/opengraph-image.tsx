import { ImageResponse } from 'next/og';
import { readJevbenchV12, jevbenchV12View } from '../../lib/jevbench-v12.mjs';

export const alt = 'Top of the current JevBench leaderboard';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const short = (name: string) => name.split(' (')[0].split(', formerly')[0];

export default async function Image() {
  const view = jevbenchV12View(await readJevbenchV12());
  const all = [...view.ranked, ...view.honorable, ...view.partial];
  const systems = all.length;
  const date = new Date(view.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '36px 56px 30px', background: '#07111f', color: '#f8fafc', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6ee7b7', fontSize: 30, fontWeight: 700, letterSpacing: 0.8 }}>
        <span>BENCHMARK HEAVEN</span><span>benchmarkheaven.com</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 52, lineHeight: 1.02, fontWeight: 800 }}>JevBench Score</div>
          <div style={{ display: 'flex', marginTop: 7, color: '#c3cfde', fontSize: 36, fontWeight: 600 }}>JevBench {view.revision} · {date} · {systems} systems · {view.decisions} decisions</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {view.ranked.slice(0, 5).map((row, index) => (
          <div key={row.key} style={{ display: 'flex', alignItems: 'center', height: 68, borderRadius: 12, padding: '0 20px', background: index === 0 ? '#12382f' : '#101e30', border: index === 0 ? '2px solid #34d399' : '1px solid #24364c' }}>
            <span style={{ width: 70, color: index === 0 ? '#6ee7b7' : '#a7b7cb', fontSize: 31, fontWeight: 800 }}>#{row.rank}</span>
            <span style={{ flex: 1, fontSize: 38, fontWeight: 700 }}>{short(row.display)}</span>
            <span style={{ fontSize: 44, fontWeight: 800, color: index === 0 ? '#6ee7b7' : '#f8fafc' }}>{row.main.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
