export function usdPerM(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "$0";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1) return `$${v.toFixed(3)}`;
  if (v < 100) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(0)}`;
}

export function num(v: number | null | undefined, digits = 1): string {
  if (v == null) return "—";
  return v.toFixed(digits);
}

/** AA benchmark sub-scores are 0–1 fractions; show as %. */
export function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

// Qualitative palette chosen for maximum hue separation between the vendors that
// previously clashed: Anthropic (coral) vs Xiaomi (amber); Moonshot/Kimi (violet)
// vs Z.ai/GLM (teal); Google (blue) vs DeepSeek (navy) vs Meta (sky).
export const ORG_COLORS: Record<string, string> = {
  Anthropic: "#E8835A",     // coral
  OpenAI: "#19C37D",        // green
  Google: "#4285F4",        // blue
  "Moonshot AI": "#9B5DE5", // violet
  "Z.ai": "#00BFA6",        // teal
  MiniMax: "#FF4D8D",       // magenta/pink
  Xiaomi: "#F5C518",        // amber/yellow
  DeepSeek: "#1F5FBF",      // navy
  xAI: "#AEB6C2",           // slate
  Meta: "#00A3E0",          // sky
  Mistral: "#FA5252",       // red
  Alibaba: "#C026D3",       // fuchsia
  Amazon: "#FF9900",        // orange
  Microsoft: "#7CB342",     // olive-green
  Cohere: "#5C946E",        // sage
  NVIDIA: "#76B900",        // nvidia green
  IBM: "#1F70C1",
  "Liquid AI": "#00C2A8",
  "LG AI Research": "#D4467E",
  "Allen Institute for AI": "#F2994A",
  "Nous Research": "#B388FF",
  "AI21 Labs": "#E84393",
  Perplexity: "#20808D",
  InclusionAI: "#6C8EBF",
  Other: "#8A93A3",         // gray
};

export function orgColor(org: string): string {
  return ORG_COLORS[org] || ORG_COLORS.Other;
}

// Symbol encodes licensing: closed-lab models = circle, open-weights = square.
export type ModelSymbol = "circle" | "square";
export function modelSymbol(openWeights: boolean): ModelSymbol {
  return openWeights ? "square" : "circle";
}
