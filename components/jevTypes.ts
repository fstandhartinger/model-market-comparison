// Shared by the server-rendered v1.4 board and the client compare view: a "use client" module's exports are only
// references on the server, so plain maps must live in a plain module.
export const JEV_TYPE_VAR: Record<string, string> = {
  jev: "--jev-t-jev", "jev-rebuild": "--jev-t-rebuild", "llm-baseline": "--jev-t-llm", "small-tool-model": "--jev-t-tool",
  "jev-service": "--jev-t-service", classifier: "--jev-t-classifier", "decision-api": "--jev-t-api",
  reranker: "--jev-t-reranker", "raw-logit-control": "--jev-t-control", "native-logit": "--jev-t-native",
};
export const JEV_TYPE_LABEL: Record<string, string> = {
  jev: "Jev (TypeSafe, closed)", "jev-rebuild": "Jev rebuild", "llm-baseline": "Instruction model, JSON schema",
  "small-tool-model": "Small tool-calling model", "jev-service": "Service built on Jev", classifier: "Zero-shot classifier",
  "decision-api": "Closed decision API", reranker: "Reranker (neutral adapter)", "raw-logit-control": "Raw-logit control (base model)",
  "native-logit": "Native-logit decision engine",
};
