// Shared by the server-rendered v1.4 board and the client compare view: a "use client" module's exports are only
// references on the server, so plain maps must live in a plain module.
export const JEV_TYPE_VAR: Record<string, string> = {
  jev: "--jev-t-jev", "jev-rebuild": "--jev-t-rebuild", "llm-baseline": "--jev-t-llm", "small-tool-model": "--jev-t-tool",
  "jev-service": "--jev-t-service", classifier: "--jev-t-classifier", "decision-api": "--jev-t-api",
  reranker: "--jev-t-reranker", "raw-logit-control": "--jev-t-control", "native-logit": "--jev-t-native",
  // F-192: the v1.4.2 artifact introduced this class and named no label for it; the colour is ours, the label is the data owner's.
  "system-one-open": "--jev-t-sysone",
};
export const JEV_TYPE_LABEL: Record<string, string> = {
  jev: "Jev (TypeSafe, closed)", "jev-rebuild": "Jev rebuild", "llm-baseline": "Instruction model, JSON schema",
  "small-tool-model": "Small tool-calling model", "jev-service": "Service built on Jev", classifier: "Zero-shot classifier",
  "decision-api": "Closed decision API", reranker: "Reranker (neutral adapter)", "raw-logit-control": "Raw-logit control (base model)",
  "native-logit": "Native-logit decision engine",
};

/** F-192 (Fable pass 35): a class the artifact carries but this repo has no label for keeps its own swatch
 *  (`--jev-t-unnamed`) rather than the llm-baseline green, so no class is ever drawn as another class. */
export const jevTypeVarName = (cls: string) => JEV_TYPE_VAR[cls] ?? "--jev-t-unnamed";

/** The legend's classes present in a board: the labelled ones in their canonical order, then any unlabelled
 *  class the data carries — which the caller prints as its key in code font until the data owner names it. */
export const jevLegendTypes = (classes: readonly string[]) => {
  const present = new Set(classes.filter(Boolean));
  const labelled = Object.keys(JEV_TYPE_LABEL).filter((t) => present.has(t));
  const unlabelled = [...present].filter((t) => !JEV_TYPE_LABEL[t]).sort();
  return [...labelled, ...unlabelled];
};
