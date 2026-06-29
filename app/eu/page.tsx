import Link from "next/link";
import { getDataset, cheapestOffers } from "../../lib/data";
import { usdPerM } from "../../lib/format";

export const dynamic = "force-dynamic";

// The SOTA open models that are genuinely competitive with the leading US closed
// labs on coding — the only ones worth seeking an EU host for.
const SOTA = [
  { key: "glm-5.2", name: "GLM 5.2" },
  { key: "glm-5.1", name: "GLM 5.1" },
  { key: "kimi-k2.6", name: "Kimi K2.6" },
  { key: "kimi-k2.7-code", name: "Kimi K2.7 Coding" },
  { key: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
  { key: "minimax-m2.7", name: "MiniMax M2.7" },
  { key: "minimax-m3", name: "MiniMax M3" },
  { key: "minimax-m2.5", name: "MiniMax M2.5" },
  { key: "mimo-v2.5-pro", name: "Xiaomi MiMo-V2.5-Pro" },
];

const EU_HOSTED = new Set(["Nebius", "Inceptron", "AWS Bedrock", "Azure AI Foundry", "Google Vertex AI"]);

// EU-sovereign providers that DO expose a per-token API but only for Western open
// models — i.e. not an option for the SOTA coding models above.
const SOVEREIGN = [
  { name: "STACKIT AI Model Serving", org: "Schwarz Group (DE)", certs: "BSI C5, ISO 27001", models: "gpt-oss-120b/20b, Qwen3-VL-235B, Llama 3.3 70B, Gemma 3", url: "https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/" },
  { name: "T-Systems LLMHub (Telekom)", org: "Deutsche Telekom (DE)", certs: "sovereign T-Cloud · €1,000/mo min", models: "gpt-oss-120b, Llama 3.3, Mistral, Qwen3", url: "https://docs.llmhub.t-systems.net/models" },
  { name: "IONOS AI Model Hub", org: "IONOS (DE)", certs: "BSI C5, Gaia-X", models: "gpt-oss-120b, Llama 3.1/3.3, Mistral, Qwen3-Coder-Next-80B", url: "https://docs.ionos.com/cloud/ai/ai-model-hub/models/models-comparison" },
  { name: "OVHcloud AI Endpoints", org: "OVHcloud (FR)", certs: "SecNumCloud/ANSSI, ZDR", models: "gpt-oss-120b, Llama 3.3, Qwen3.x, Mistral", url: "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/" },
  { name: "Scaleway Generative APIs", org: "Scaleway (FR)", certs: "GDPR, ZDR by default", models: "Qwen3-235B, Mistral, gpt-oss-120b, MiniMax M2.5, DeepSeek", url: "https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/" },
  { name: "SAP Generative AI Hub", org: "SAP (DE)", certs: "enterprise · opaque CU billing", models: "mostly proprietary frontier; open weights deprecated/BYOM", url: "https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/models-and-scenarios-in-generative-ai-hub" },
];

// EU providers that do NOT offer a usable per-token API for benchmarked models —
// either they serve only their own proprietary models (not in any public benchmark)
// or they are GPU/dedicated rental only. Listed for completeness; excluded from the
// price comparison. (Set surfaced by llm-tracker.eu.)
const PROPRIETARY = [
  { name: "Aleph Alpha", org: "DE", what: "Own proprietary Pharia models only — not in public benchmarks; sovereign on-prem/Gaia-X focus." },
  { name: "IBM watsonx", org: "US/EU regions", what: "Pushes own Granite models; not benchmark-competitive for SOTA coding." },
  { name: "GPU / dedicated rental only", org: "Hetzner, OVHcloud (bare GPU), Open Telekom Cloud, Exoscale, Scaleway GPU, IONOS GPU, CoreWeave EU, Aruba, elastx, Genesis, gridscale, Seeweb, UpCloud, Cloudiax", what: "Rent GPUs / VMs and self-host any model — no managed per-token API, so no comparable price." },
  { name: "US-law platforms (EU region only)", org: "Hugging Face, Together AI", what: "EU data residency only via enterprise/dedicated; operating company under US law." },
];

export default async function EuPage() {
  const ds = await getDataset();
  const find = (k: string) => ds.models.find((m) => m.family_key === k);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">EU sovereign cloud &amp; data residency</h1>
      <p className="mt-2 text-sm text-gray-400">
        Where can you run these models on <b className="text-gray-200">European-hosted, GDPR-compliant</b>
        {" "}infrastructure — and is that even possible for the models that matter?
      </p>

      <section className="card mt-5 p-4">
        <h2 className="font-semibold">The catch: only a handful of open models are SOTA-competitive on coding</h2>
        <p className="mt-2 text-sm text-gray-400">
          Of the open-weight models, only <b className="text-gray-200">GLM 5.1+, Kimi K2.6+, DeepSeek V4 Pro,
          MiniMax M2.7+</b> (and arguably <b className="text-gray-200">Xiaomi MiMo-V2.5-Pro</b>) are genuinely
          competitive with the leading US closed labs (Claude Opus, GPT-5.x, Gemini) on coding. Everything
          else an EU host typically offers — gpt-oss-120b, Llama 3.x, Mistral, Qwen3 — is a clear step below
          on the coding benchmarks tracked in this app. So the relevant question isn&apos;t &ldquo;is there an
          EU inference provider?&rdquo; (there are many) but <b className="text-gray-200">&ldquo;is there an EU
          provider that hosts the SOTA models?&rdquo;</b>
        </p>
      </section>

      <h2 className="mt-6 mb-2 text-lg font-semibold">✅ EU-hosted providers that serve the SOTA models</h2>
      <div className="card overflow-x-auto">
        <table className="dtable w-full text-sm">
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Model</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">EU-hosted offers (10:1 blended $/1M)</th>
          </tr></thead>
          <tbody>
            {SOTA.map((s) => {
              const m = find(s.key);
              // Azure serves GLM/Kimi/MiniMax only via Fireworks, which is excluded from
              // the EU Data Boundary — so don't count it as a true EU route for those.
              const azureFireworks = /^(glm-|kimi-|minimax-)/.test(s.key);
              const euOffers = m ? cheapestOffers(m, 20).filter((o) => EU_HOSTED.has(o.provider) && !(azureFireworks && o.provider === "Azure AI Foundry")) : [];
              return (
                <tr key={s.key}>
                  <td className="px-3 py-2 font-medium">{m ? <Link href={`/models/${encodeURIComponent(m.id)}`} className="hover:text-accent">{s.name}</Link> : s.name}</td>
                  <td className="px-3 py-2 text-sm">
                    {euOffers.length
                      ? euOffers.map((o, i) => <span key={i} className="mr-3 whitespace-nowrap"><b>{o.provider}</b> <span className="text-gray-400">{usdPerM(o.blended)}</span></span>)
                      : <span className="text-warn/90">no EU-hosted route — self-host the open weights in an EU region</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        <b className="text-accent2">Nebius</b> (Netherlands; EU regions in Finland/France; ZDR + no-training) is the
        broadest EU option — it carries GLM 5.1/5.2, Kimi K2.6, DeepSeek V4 Pro and MiniMax. <b className="text-accent2">Inceptron</b>
        {" "}(Sweden; ISO 27001, zero-retention) adds GLM 5.1, Kimi K2.6 and MiniMax M2.5. ⚠️ Nebius serves a few
        models from non-EU regions (per model — check the note); and Azure&apos;s Kimi/GLM/MiniMax are <b>Fireworks-hosted
        and excluded from the EU Data Boundary</b> (US-served), so they are not a true EU route. MiniMax M2.7/M3, Kimi
        K2.7 and MiMo currently have <b>no managed EU host</b>.
      </p>

      <h2 className="mt-6 mb-2 text-lg font-semibold">🟡 Coming soon</h2>
      <p className="text-sm text-gray-400">
        <a href="https://api.trustedrouter.eu/" target="_blank" rel="noopener" className="text-accent">TrustedRouter</a> (api.trustedrouter.eu)
        — an EU-based, security-focused router. Still being launched / not production-ready yet; tracked here so it shows up
        once it goes live.
      </p>

      <h2 className="mt-6 mb-2 text-lg font-semibold">❌ EU-sovereign providers — real, but not an option for SOTA coding</h2>
      <p className="mb-3 text-sm text-gray-400">
        These German/French sovereign clouds expose proper per-token APIs with strong residency &amp; certifications,
        but their catalogs are limited to <b>Western open models</b> (gpt-oss / Llama / Mistral / Qwen). None host the
        SOTA Chinese coding models, so for top-tier coding capability with EU residency they are <b>not currently a
        substitute</b>. Their model listings:
      </p>
      <div className="card overflow-x-auto">
        <table className="dtable w-full text-sm">
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Provider</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Residency / notes</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Models offered</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Listing</th>
          </tr></thead>
          <tbody>
            {SOVEREIGN.map((p) => (
              <tr key={p.name}>
                <td className="px-3 py-2 font-medium">{p.name}<div className="text-[11px] text-gray-500">{p.org}</div></td>
                <td className="px-3 py-2 text-xs text-gray-400">{p.certs}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{p.models}</td>
                <td className="px-3 py-2 text-xs"><a href={p.url} target="_blank" rel="noopener" className="text-accent">models ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 mb-2 text-lg font-semibold">⛔ Proprietary-only &amp; GPU-rental EU providers (not in the comparison)</h2>
      <p className="mb-3 text-sm text-gray-400">
        These EU vendors appear in residency trackers but are <b>excluded from the price comparison</b>: they either serve
        only their own proprietary models that aren&apos;t in any public benchmark (e.g. <b>Aleph Alpha&apos;s Pharia</b>,
        IBM Granite), or they only rent GPUs/VMs with no managed per-token API.
      </p>
      <div className="card overflow-x-auto">
        <table className="dtable w-full text-sm">
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Provider</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Where</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Why it&apos;s not listed</th>
          </tr></thead>
          <tbody>
            {PROPRIETARY.map((p) => (
              <tr key={p.name}>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{p.org}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{p.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gray-400">
        📊 For a continuously-maintained map of which LLMs actually run on EU soil (and which providers are under the US
        CLOUD Act), see the community <a href="https://llm-tracker.eu/" target="_blank" rel="noopener" className="text-accent">EU LLM Hosting Tracker (llm-tracker.eu) ↗</a>.
      </p>

      <h2 className="mt-6 mb-2 text-lg font-semibold">Hyperscaler EU regions &amp; confidentiality</h2>
      <ul className="space-y-1.5 text-sm text-gray-300">
        <li>• <b>AWS Bedrock</b> (EU Geo profile) — strongest turnkey EU posture: EU cross-region inference + zero-data-retention by default. Western open models only (Llama/Mistral/DeepSeek V3.2/Nova/gpt-oss).</li>
        <li>• <b>Azure AI Foundry</b> EU Data Zone — Mistral-Large-3 etc.; but Fireworks-hosted Kimi/GLM/MiniMax are <b>outside</b> the EU boundary.</li>
        <li>• <b>Google Vertex AI</b> europe-west / EU multi-region — Gemini + Model-Garden open models; never use the global endpoint.</li>
        <li>• <b>Confidentiality (TEE)</b> for GLM/Kimi/MiniMax: <b>Chutes</b> (Intel TDX + NVIDIA CC, 13 TEE models) gives confidentiality but no EU pinning; <b>Privatemode</b> (Edgeless Systems, Germany) is EU-pinned + confidential but narrow.</li>
      </ul>

      <p className="mt-6 text-xs text-gray-500">
        Use the global <b>&ldquo;EU-hosted only&rdquo;</b> and <b>&ldquo;Non-US provider only&rdquo;</b> filters (top bar) to
        restrict every tab&apos;s pricing to these providers. Full research with sources lives in
        {" "}<code>data/research/</code> in the repository.
      </p>
    </div>
  );
}
