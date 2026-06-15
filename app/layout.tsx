import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "../components/Nav";

export const metadata: Metadata = {
  title: "Model Market Comparison",
  description:
    "Compare open-source & frontier LLM prices across OpenRouter providers, AWS Bedrock, Azure AI Foundry, GitHub Copilot and Claude Code — with ArtificialAnalysis and DesignArena benchmarks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-[1400px] px-4 py-10 text-xs text-gray-500">
          Data: OpenRouter · ArtificialAnalysis · DesignArena · AWS Bedrock · Azure AI Foundry ·
          GitHub Copilot · Anthropic. Prices are list/on-demand USD per 1M tokens unless noted.
          Not affiliated with any provider — figures may be stale; verify before relying on them.
        </footer>
      </body>
    </html>
  );
}
