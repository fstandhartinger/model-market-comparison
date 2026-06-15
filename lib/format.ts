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

export const ORG_COLORS: Record<string, string> = {
  Anthropic: "#d97757",
  OpenAI: "#10a37f",
  Google: "#4285f4",
  "Moonshot AI": "#7c5cff",
  "Z.ai": "#00b8d9",
  MiniMax: "#ff5c8a",
  Xiaomi: "#ff6900",
  DeepSeek: "#4d6bfe",
  xAI: "#cccccc",
  Meta: "#0668e1",
  Mistral: "#ff7000",
  Alibaba: "#9b59ff",
  Amazon: "#ff9900",
  Microsoft: "#00a4ef",
  Cohere: "#39594d",
  Other: "#8a93a3",
};

export function orgColor(org: string): string {
  return ORG_COLORS[org] || ORG_COLORS.Other;
}
