import { ImageResponse } from 'next/og';

export const alt = 'JevBench by Benchmark Heaven: a benchmark for Jev-class decision models across intelligence, calibration, speed, and cost.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '50px 64px', background: '#07111f', color: '#f8fafc', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6ee7b7', fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
        <span>BENCHMARK HEAVEN</span><span>benchmarkheaven.com</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 36 }}>
        <div style={{ fontSize: 68, lineHeight: 1.05, fontWeight: 800 }}>JevBench</div>
        <div style={{ color: '#c3cfde', fontSize: 36, fontWeight: 600 }}>Jev-class decision models</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
          {['Intelligence', 'Calibration', 'Speed', 'Cost'].map((axis) => <span key={axis} style={{ border: '1px solid #35516b', borderRadius: 12, padding: '13px 18px', color: '#e2e8f0', fontSize: 24, fontWeight: 600 }}>{axis}</span>)}
        </div>
      </div>
      <div style={{ display: 'flex', color: '#94a3b8', fontSize: 24 }}>Benchmark Heaven · transparent decision-model evaluation</div>
    </div>,
    size,
  );
}
