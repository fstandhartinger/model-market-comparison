import { GatewaysView } from "../../components/GatewaysView";
import gw from "../../data/gateways.json";

export const metadata = { title: "LLM Gateways — Model Market Comparison" };

export default function GatewaysPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">LLM Gateways &amp; Routers</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Multi-provider gateways / routers / aggregators (one API key for many models). Compare them on what
        matters for European deployments: can the <b>actual inference be kept in the EU</b>, can the gateway
        <b> run locally / self-hosted</b>, and is it <b>open source</b>. Be skeptical of &ldquo;GDPR-compliant&rdquo;
        badges — most providers&apos; &ldquo;EU&rdquo; means EU-resident <i>logs/metadata</i>, not EU routing of the
        model inference. The <b>EU routing</b> column captures the real capability.
      </p>
      <GatewaysView gateways={gw.gateways} collectedAt={gw.collected_at} note={gw.note} />
    </div>
  );
}
