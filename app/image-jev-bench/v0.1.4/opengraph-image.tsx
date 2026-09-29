import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 76, color: '#f6f8fb', background: 'linear-gradient(135deg, #0a1724, #152944)' }}>
    <div style={{ fontSize: 26, color: '#6ce0c0', letterSpacing: 4 }}>BENCHMARK HEAVEN · ARCHIVE</div>
    <div style={{ marginTop: 34, fontSize: 78, fontWeight: 800, lineHeight: 1.05 }}>Image JevBench v0.1.4</div>
    <div style={{ marginTop: 20, fontSize: 36, color: '#cbd8e5' }}>Archived image decision benchmark results.</div>
  </div>, size);
}
