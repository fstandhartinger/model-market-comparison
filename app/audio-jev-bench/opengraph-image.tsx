import { ImageResponse } from 'next/og';
import { audiojevView, readAudiojevPreview } from '../../lib/audiojev-preview.mjs';

// CR-214: link preview for /audio-jev-bench — the top three ranked Jev-class systems by Capability, from the same data file.
export const alt = 'AudioJevBench v0.1 by Benchmark Heaven: audio decision models across intelligence, calibration, speed and cost.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const v = audiojevView(await readAudiojevPreview());
  const top = v.capability.filter((r) => r.capabilityRank != null).slice(0, 3);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '46px 64px', background: 'linear-gradient(135deg, #07111f, #14243d)', color: '#f8fafc', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6ee7b7', fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>
        <span>BENCHMARK HEAVEN</span><span>benchmarkheaven.com/audio-jev-bench</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 800 }}>AudioJevBench v0.1</div>
        <div style={{ display: 'flex', color: '#c3cfde', fontSize: 32, fontWeight: 600, marginTop: 12 }}>Voice-agent decisions straight from audio · {v.systems.length} systems</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {top.map((r) => <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 28 }}>
          <span style={{ width: 40, color: '#94a3b8', fontWeight: 700 }}>#{r.capabilityRank}</span>
          <span style={{ width: 470, fontWeight: 700 }}>{r.name}</span>
          <div style={{ display: 'flex', width: 420, height: 22, background: '#1e324c', borderRadius: 6 }}>
            <div style={{ width: `${Math.max(0, Math.min(100, r.capability ?? 0)) * 4.2}px`, height: 22, background: '#4a95ea', borderRadius: 6 }} />
          </div>
          <span style={{ fontWeight: 800 }}>{(r.capability ?? 0).toFixed(1)}</span>
        </div>)}
      </div>
      <div style={{ display: 'flex', color: '#94a3b8', fontSize: 22 }}>Capability of Jev-class audio systems · Intelligence · Calibration · Speed · Cost</div>
    </div>,
    size,
  );
}
