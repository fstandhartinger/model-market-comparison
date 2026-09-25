import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 76, color: '#f6f8fb', background: 'linear-gradient(135deg, #0a1724, #152944)' }}>
    <div style={{ fontSize: 26, color: '#6ce0c0', letterSpacing: 4 }}>BENCHMARK HEAVEN</div>
    <div style={{ marginTop: 34, fontSize: 78, fontWeight: 800, lineHeight: 1.05 }}>Image JevBench</div>
    <div style={{ marginTop: 20, fontSize: 36, color: '#cbd8e5' }}>Image decisions, measured across four axes.</div>
    <div style={{ marginTop: 54, display: 'flex', gap: 22, fontSize: 25, color: '#a9c6da' }}>
      <span>Intelligence</span><span>·</span><span>Calibration</span><span>·</span><span>Speed</span><span>·</span><span>Cost</span>
    </div>
  </div>, size);
}
