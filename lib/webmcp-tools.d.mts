export const WEBMCP_LIMITS: { searchMax: number; resultsMax: number; modelsMax: number; summaryBenchmarksMax: number; queryMaxLength: number };
export const WEBMCP_TOOL_SCHEMAS: { search_benchmarks: object; get_benchmark_results: object; get_model_benchmark_summary: object };
export const WEBMCP_TOOL_DESCRIPTIONS: Record<"search_benchmarks" | "get_benchmark_results" | "get_model_benchmark_summary", string>;
export function validateInput(name: string, input: unknown): { ok: false; error: { code: string; message: string } } | null;
export function createWebMcpTools(get: (path: string) => Promise<any>): Record<"search_benchmarks" | "get_benchmark_results" | "get_model_benchmark_summary", (input: unknown) => Promise<any>>;
