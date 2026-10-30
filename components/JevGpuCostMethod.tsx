import { hasPublishedJevbenchV180Release } from '../lib/jevbench-v180-release.mjs';
export async function JevGpuCostMethod() {
 if (!(await hasPublishedJevbenchV180Release())) return null;
 return <section className="mx-auto mt-10 max-w-4xl pb-10" id="self-hosted-gpu-cost" data-bh-jev-gpu-method>
 <h2 className="text-2xl font-bold">Cost of self-hosted open weights, from v1.8</h2>
 <p className="mt-3">Until v1.7, self-hosted open weights used the public list-price estimate for their base model, applied to the row&apos;s own scored tokens. From v1.8, they use GPU time: GPU price per hour multiplied by the hours one GPU needs for 1,000 decisions on the same scored inputs and outputs. The estimate is capped at the old list-price cost, so no row becomes more expensive.</p>
 <p className="mt-3">GPU price: EUR 999/month for one RTX PRO 6000 96 GB, divided by 730 hours and converted at the ECB rate of USD 1.1133/EUR on 28 October 2026: USD 1.5235/hour, at 70% average load. Cost per 1,000 decisions = min(old list-price cost, 1.5235 × tokens per decision × 1,000 / (3,600 × throughput × 0.70)). Each row retains the token totals and item membership used for its preceding cost, including legacy rows priced on earlier pools.</p>
 <p className="mt-3">Architecture estimates use an efficient inference engine on one GPU, including batching and prefix caching, calibrated on public items on 29 October 2026. Throughput is capped at 100,000 tokens/s. The constants below are divided by active parameters in billions; small means below 20B active parameters. Encoders and architectures outside the six calibrated Gemma/Qwen classes keep their old cost. Throughput was calibrated on prompt processing (prefill); generated tokens are counted at the same rate. Three diffusion-readout rows are priced with the closest calibrated class (MoE Gemma); this is an approximation. A missing verified token basis also keeps the old cost and is disclosed.</p>
 <table className="mt-3 text-sm"><thead><tr><th className="pr-6 text-left">Architecture class</th><th className="text-left">Tokens/s</th></tr></thead><tbody>
 <tr><td>Dense Gemma</td><td>313,302 / active B</td></tr><tr><td>Dense Qwen</td><td>317,601 / active B</td></tr>
 <tr><td>Small Gemma</td><td>322,343 / active B</td></tr><tr><td>Small Qwen</td><td>246,100 / active B</td></tr>
 <tr><td>MoE Gemma</td><td>138,650 / active B</td></tr><tr><td>MoE Qwen</td><td>113,999 / active B</td></tr>
 </tbody></table>
 <p className="mt-3">The following thirteen rows use direct efficient-throughput measurements instead of their class estimate: fresh passes over 200 public decisions on an RTX PRO 6000 Server, stock vLLM 0.32.0 EFF. Native uses the row&apos;s own weights; base-arch uses its weights with native attention or head changes omitted; trunk-equivalent uses the stock Qwen3.8-27B trunk with the row&apos;s own prompts and does not reproduce the custom 255-way readout head or noncausal attention. These throughput measurements estimate efficient serving cost; they do not replace the measured latency or benchmark answers.</p>
 <table className="mt-3 text-sm"><thead><tr><th className="pr-4 text-left">Model</th><th className="pr-4 text-left">Load mode</th><th className="text-left">Measured tokens/s</th></tr></thead><tbody>
<tr key="ajev-gemma4-31b-lm6q"><td className="pr-4">AJev lm6q (Gemma 4 31B)</td><td className="pr-4">native</td><td>8,583</td></tr>
<tr key="basal-omni-1.0-ultra"><td className="pr-4">basal-omni-1.0-ultra (Remek Kinas, Gemma-4-31B-it + merged LoRA, typed-decision readout, self-hosted)</td><td className="pr-4">native</td><td>10,285</td></tr>
<tr key="dopest-1.0-31b"><td className="pr-4">DOPEST 1.0 31B</td><td className="pr-4">native</td><td>8,752</td></tr>
<tr key="fastino-glide-1.2-open"><td className="pr-4">Fastino GLiDE 1.2 (open weights, self-hosted)</td><td className="pr-4">trunk-equivalent</td><td>11,861</td></tr>
<tr key="h2o-lightning-31b"><td className="pr-4">H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted)</td><td className="pr-4">native</td><td>10,147</td></tr>
<tr key="jeffan-31b-1710"><td className="pr-4">Jeffan-31b-1710</td><td className="pr-4">native</td><td>13,045</td></tr>
<tr key="knowline-31b-gen1"><td className="pr-4">KnowLine 31B-Gen1</td><td className="pr-4">native</td><td>10,271</td></tr>
<tr key="mammoth-1"><td className="pr-4">baselabs mammoth-1 (27B)</td><td className="pr-4">base-arch</td><td>11,840</td></tr>
<tr key="pplx-decider-v1-1-27b"><td className="pr-4">Perplexity Decider v1.1 27B (Qwen3.8-27B, noncausal decision readout)</td><td className="pr-4">trunk-equivalent</td><td>11,831</td></tr>
<tr key="startlux-decision-v1.1-27b-instant"><td className="pr-4">StartLux-Decision v1.1 27B Instant (StartLux Labs, Qwen3.8-27B fine-tune)</td><td className="pr-4">base-arch</td><td>11,849</td></tr>
<tr key="turion-jev-31b"><td className="pr-4">Turion Jev 31B</td><td className="pr-4">native</td><td>10,665</td></tr>
<tr key="vllm-sr-d3"><td className="pr-4">vLLM-SR d3</td><td className="pr-4">trunk-equivalent</td><td>11,823</td></tr>
<tr key="vllm-sr-d3-turbo"><td className="pr-4">vLLM-SR d3-turbo</td><td className="pr-4">trunk-equivalent</td><td>11,805</td></tr>
 </tbody></table>
 <p className="mt-3">API systems retain their published prices. The Jev-compatible reference, cost cap of USD 0.06459465517241379 per 1,000 decisions and median-latency cap of 1.2329566404223442 seconds are unchanged. Intelligence, Calibration, the ten-second failure rule and measured latency are unchanged. Cost axes, composites and eligibility reflect the new costs. Affected composite confidence intervals are withheld because the archived intervals used the old cost; Intelligence and Calibration intervals are retained. Archived v1.7 release pages keep the earlier values.</p>
 </section>;
}
