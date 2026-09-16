import { EuSotaTableLoader } from "../../components/deferred/EuSotaTableLoader";
import { pageDataVersion } from "../../lib/page-data";
import { previewMetadata } from "../../lib/seo";


// The SOTA open models that are genuinely competitive with the leading US closed
// labs on coding — the only ones worth seeking an EU host for.
// CR-63.2 (2026-09-16): refreshed to the current catalog — the leading open-weight families by AA
// Intelligence Index that are not deprecated (GLM 5.1, Kimi K2.6, MiniMax M2.5/M2.7 now are).
const SOTA = [
  { key: "glm-5.3", name: "GLM 5.3" },
  { key: "kimi-k3", name: "Kimi K3" },
  { key: "glm-5.3-flash", name: "GLM 5.3 Flash" },
  { key: "qwen3.8-2.4t-a95b", name: "Qwen3.8 2.4T A95B" },
  { key: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
  { key: "deepseek-v4-pro-0813", name: "DeepSeek V4 Pro 0813" },
  { key: "glm-5.2", name: "GLM 5.2" },
  { key: "kimi-k2.7-code", name: "Kimi K2.7 Coding" },
  { key: "minimax-m3", name: "MiniMax M3" },
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
  { name: "TrustedTokens", org: "TNG Technology Consulting (DE)", certs: "TNG GPUs at Noris Aschheim/Munich · no logging beyond the API call · B2B plan-credit", models: "GLM 5.3/5.2/5.3-Flash, DeepSeek V4.x, Qwen3.x, gpt-oss-120b, DeepSeek-TNG-R1T2-Chimera, Gemma", url: "https://trustedtokens.eu/models" },
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

export const metadata = previewMetadata({ path: "/eu", documentTitle: "EU sovereign cloud", title: "Run frontier open models in the EU — Benchmark Heaven",
  description: "Which competitive AI models can run on European-hosted, GDPR-compliant infrastructure, from which providers and at what price." });

export default async function EuPage() {
  const version = await pageDataVersion();

  return (
    <div className="max-w-4xl">
      {/* CR-63.15: the same page head as the other tabs. */}
      <header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">EU sovereign cloud &amp; data residency</h1>
      <p className="bh-muted mt-3 max-w-2xl">
        Where can you run these models on <b className="text-gray-200">European-hosted, GDPR-compliant</b>
        {" "}infrastructure — and is that even possible for the models that matter?
      </p></header>

      <section className="card mt-5 p-4">
        <h2 className="font-semibold">The catch: only a handful of open models are SOTA-competitive on coding</h2>
        <p className="mt-2 text-sm text-gray-400">
          {/* CR-63.15: no version numbers here — the current families are the table below, which follows the catalog. */}
          Only the newest large open-weight models — the families in the table below — come close to the leading closed
          models on coding. Much of what EU hosts typically offer — gpt-oss-120b, Llama 3.x, Mistral, smaller Qwen
          models — is a clear step below on the coding benchmarks tracked in this app. So the relevant question isn&apos;t
          &ldquo;is there an EU inference provider?&rdquo; (there are many) but <b className="text-gray-200">&ldquo;is there an EU
          provider that hosts the SOTA models?&rdquo;</b>
        </p>
      </section>

      <h2 className="mt-6 mb-2 text-lg font-semibold">✅ EU-hosted and company-approved equivalent offers for SOTA models</h2>
      <EuSotaTableLoader version={version} entries={SOTA} />
      {/* CR-63.15: one bullet per EU provider plus the policy exceptions (was one bold 12-line paragraph). The table
          lists a provider only where that specific model runs in the EU; which models each serves is in the table. */}
      <ul className="mt-3 space-y-1.5 text-xs text-gray-400">
        <li>• <b className="text-gray-300">TensorX</b> — Ireland, three EU data-centre regions isolated from US hyperscalers, zero data retention; the broadest in-EU catalog of open models.</li>
        <li>• <b className="text-gray-300">Inceptron</b> — Swedish company, Finnish datacenter, zero retention.</li>
        <li>• <b className="text-gray-300">Scaleway</b> — serves from Paris, zero data retention by default.</li>
        <li>• <b className="text-gray-300">Nebius</b> — Netherlands, Finland/France infrastructure, opt-in zero retention and no training; its catalog mixes EU, US and UK regions, so each model&apos;s offer is checked separately.</li>
        <li>• <b className="text-gray-300">NextBit</b> — Spain, EU-hosted endpoints on OpenRouter.</li>
        <li>• <b className="text-gray-300">Policy exceptions</b> — the native Azure Direct Global offers for DeepSeek V4 Pro and Kimi K2.7 Code count as company-approved EU-hosted equivalents. That is a business classification for this application, not an EU-residency guarantee: those deployments may process inference outside the EU. Azure&apos;s Fireworks-hosted alternatives stay US-served and excluded.</li>
      </ul>

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
