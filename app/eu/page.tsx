import { getDataset } from "../../lib/data";
import { clientData } from "../../lib/client-model";
import { EuSotaTable } from "../../components/EuSotaTable";

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

// Additional EU-sovereign providers that expose a per-token API. Most focus on
// Western open models; Scaleway now also carries GLM 5.2 from its Paris region.
const SOVEREIGN = [
  { name: "STACKIT AI Model Serving", org: "Schwarz Group (DE)", certs: "BSI C5, ISO 27001", models: "gpt-oss-120b/20b, Qwen3-VL-235B, Llama 3.3 70B, Gemma 3", url: "https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/" },
  { name: "T-Systems LLMHub (Telekom)", org: "Deutsche Telekom (DE)", certs: "sovereign T-Cloud · €1,000/mo min", models: "gpt-oss-120b, Llama 3.3, Mistral, Qwen3", url: "https://docs.llmhub.t-systems.net/models" },
  { name: "IONOS AI Model Hub", org: "IONOS (DE)", certs: "BSI C5, Gaia-X", models: "gpt-oss-120b, Llama 3.1/3.3, Mistral, Qwen3-Coder-Next-80B", url: "https://docs.ionos.com/cloud/ai/ai-model-hub/models/models-comparison" },
  { name: "OVHcloud AI Endpoints", org: "OVHcloud (FR)", certs: "SecNumCloud/ANSSI, ZDR", models: "gpt-oss-120b, Llama 3.3, Qwen3.x, Mistral", url: "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/" },
  { name: "Scaleway Generative APIs", org: "Scaleway (FR)", certs: "GDPR, ZDR by default", models: "GLM 5.2, Qwen3.x, Mistral, Llama, Gemma, gpt-oss-120b, Holo2", url: "https://www.scaleway.com/en/pricing/model-as-a-service/" },
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
  const data = clientData(ds);

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
          competitive with the leading US closed labs (Claude Opus, GPT-5.x) on coding. Everything
          else an EU host typically offers — gpt-oss-120b, Llama 3.x, Mistral, Qwen3 — is a clear step below
          on the coding benchmarks tracked in this app. So the relevant question isn&apos;t &ldquo;is there an
          EU inference provider?&rdquo; (there are many) but <b className="text-gray-200">&ldquo;is there an EU
          provider that hosts the SOTA models?&rdquo;</b>
        </p>
      </section>

      <h2 className="mt-6 mb-2 text-lg font-semibold">✅ EU-hosted and company-approved equivalent offers for SOTA models</h2>
      <EuSotaTable data={data} entries={SOTA} />
      <p className="mt-2 text-xs text-gray-500">
        <b className="text-accent2">TensorX</b> (Ireland; 3 EU data-centre regions, 100% EU-sovereign / isolated from US
        hyperscalers, zero data retention) is now the <b>broadest</b> EU-sovereign option — a self-serve per-token API
        carrying GLM 5.2/5.1/5, <b>Kimi K2.7 Code</b>/K2.6/K2.5, DeepSeek V4 Pro/Flash/V3.2, <b>MiniMax M3</b>/M2.5 and Qwen,
        all in-EU. <b className="text-accent2">Inceptron</b> (Swedish HQ, Finnish datacenter; zero-retention) serves GLM 5.2,
        Kimi K2.6/K2.7 Code and MiniMax M2.5 from the EU. <b className="text-accent2">Scaleway</b> now also serves GLM 5.2
        from Paris. <b className="text-accent2">Nebius</b> (Netherlands; Finland/France; ZDR + no-training) lists GLM 5.1/5.2,
        Kimi K2.6/K2.7 Code, DeepSeek V4 Pro and MiniMax M2.5/M3 — but <b>serves several of them from
        US/UK regions</b>, so its only SOTA model currently running in an EU region is <b>GLM 5.1</b>. The table normally
        lists a provider only where that specific model runs in-EU — a provider being EU-capable in general isn&apos;t
        enough. There are exactly two deliberate company-policy exceptions: the native <b>Azure Direct Global</b>
        offers for <b>DeepSeek V4 Pro</b> and <b>Kimi K2.7 Code</b> are included as company-approved EU-hosted
        equivalents. This is a legal/business classification for this application, <b>not a technical EU-residency
        guarantee</b>; those Global deployments may process inference outside the EU. ⚠️ Azure&apos;s Fireworks-hosted
        alternatives, including GLM/MiniMax, remain <b>US-served and excluded from the EU Data Boundary</b>. Thanks to
        TensorX, <b>Kimi K2.7 Code and MiniMax M3 also have a genuinely EU-hosted
        managed route</b>; <b>NextBit</b> additionally serves DeepSeek V4 Flash from Spain. MiniMax M2.7 and Xiaomi
        MiMo-V2.5-Pro still have no managed EU route.
      </p>

      <h2 className="mt-6 mb-2 text-lg font-semibold">🟡 Coming soon</h2>
      <p className="text-sm text-gray-400">
        <a href="https://api.trustedrouter.eu/" target="_blank" rel="noopener" className="text-accent">TrustedRouter</a> (api.trustedrouter.eu)
        — an EU-based, security-focused router. Still being launched / not production-ready yet; tracked here so it shows up
        once it goes live.
      </p>

      <h2 className="mt-6 mb-2 text-lg font-semibold">EU-sovereign per-token providers and their catalogs</h2>
      <p className="mb-3 text-sm text-gray-400">
        These sovereign clouds expose proper per-token APIs with strong residency and certifications. Most catalogs
        center on Western open models (gpt-oss / Llama / Mistral / Qwen), while Scaleway now also hosts <b>GLM 5.2</b>
        in Paris. Their current model listings:
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
        <li>• <b>Azure AI Foundry</b> EU Data Zone — documented EU routes remain the technical residency standard. Separately, this company treats only the native Azure Direct Global offers for <b>DeepSeek V4 Pro</b> and <b>Kimi K2.7 Code</b> as EU-hosted equivalents for filtering; inference may still occur outside the EU. Fireworks-hosted alternatives remain <b>outside</b> the EU boundary.</li>
        <li>• <b>Google Vertex AI</b> europe-west / EU multi-region — Model-Garden open models (Llama/Gemma/DeepSeek V3.2); never use the global endpoint.</li>
        <li>• <b>Confidentiality (TEE)</b> for GLM/Kimi/MiniMax: <b>Chutes</b> (Intel TDX + NVIDIA CC, 13 TEE models) gives confidentiality but no EU pinning; <b>Privatemode</b> (Edgeless Systems, Germany) is EU-pinned + confidential but narrow.</li>
        <li>• <b>&ldquo;EU available&rdquo; but dedicated/enterprise only — not self-serve serverless</b> (so excluded as price sources): <b>Together AI</b> (Sweden GPU clusters / dedicated endpoints, Sep 2025), <b>Fireworks</b> (Frankfurt/Iceland dedicated/BYOC), <b>Cloudflare</b> (Data Localization Suite, Enterprise add-on), <b>AtlasCloud</b> (eu-west dedicated). Their public per-token APIs have no EU region selector and run from US capacity. <b>DigitalOcean</b> has EU serverless on its roadmap only. All are US-HQ (CLOUD Act).</li>
      </ul>

      <p className="mt-6 text-xs text-gray-500">
        Use the global <b>&ldquo;EU-hosted / approved equivalent only&rdquo;</b> and <b>&ldquo;Non-US provider only&rdquo;</b> filters (top bar) to
        restrict the interactive comparison views and linked model details to matching offers. Full research with sources lives in
        {" "}<code>data/research/</code> in the repository.
      </p>
    </div>
  );
}
