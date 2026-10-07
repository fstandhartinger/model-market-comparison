"use client";
import { useEffect } from "react";

/** CR-56 (Florian 2026-09-16): read-only WebMCP tools for browser agents. Nothing renders and nothing loads unless the
 *  browser exposes `modelContext.registerTool` in the top-level page (no shim, no cross-origin frames). The tools only
 *  call this site's public GET APIs; unmounting aborts the registration.
 *  CR-335 (A34, 7 Oct 2026): the current WebMCP draft puts the API on `document.modelContext` (earlier drafts and builds used
 *  `navigator.modelContext`, still accepted). The JevBench tools (list_models, get_model, compare_models) register in
 *  the same single pass, over the same-origin /api/jevbench/latest feed that the hosted /api/mcp endpoint serves. */
type ModelContext = { registerTool: (tool: object, options?: { signal?: AbortSignal }) => unknown; unregisterTool?: (name: string) => unknown };
type ToolResult = { ok: boolean };
type ToolSet = { names: string[]; schemas: Record<string, object>; descriptions: Record<string, string>; titles?: Record<string, string>; run: Record<string, (input: unknown) => Promise<ToolResult>> };

const RESPONSE_MAX_CHARS = 8_000_000; // /api/benchmarks is ~1.4 MB today

export function WebMcpTools() {
  useEffect(() => {
    const mc = (document as Document & { modelContext?: ModelContext }).modelContext
      ?? (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!mc || typeof mc.registerTool !== "function" || window.top !== window.self) return;
    const controller = new AbortController();
    const names: string[] = [];
    const get = async (path: string) => {
      const response = await fetch(path, { credentials: "omit", headers: { accept: "application/json" }, signal: typeof AbortSignal.any === "function" ? AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) : controller.signal });
      if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
      const text = await response.text();
      if (text.length > RESPONSE_MAX_CHARS) throw new Error("response too large");
      return JSON.parse(text);
    };
    Promise.all([import("../lib/webmcp-tools.mjs"), import("../lib/jevbench-mcp-tools.mjs")]).then(([catalog, jev]) => {
      if (controller.signal.aborted) return;
      let feed: Promise<unknown> | null = null;
      const getFeed = () => (feed ??= get("/api/jevbench/latest").catch((e) => { feed = null; throw e; }));
      const sets: ToolSet[] = [
        { names: Object.keys(catalog.WEBMCP_TOOL_SCHEMAS), schemas: catalog.WEBMCP_TOOL_SCHEMAS, descriptions: catalog.WEBMCP_TOOL_DESCRIPTIONS,
          run: catalog.createWebMcpTools(get) as ToolSet["run"] },
        { names: Object.keys(jev.JEVBENCH_TOOL_SCHEMAS), schemas: jev.JEVBENCH_TOOL_SCHEMAS, descriptions: jev.JEVBENCH_TOOL_DESCRIPTIONS, titles: jev.JEVBENCH_TOOL_TITLES,
          run: jev.createJevbenchTools(getFeed) as ToolSet["run"] },
      ];
      for (const set of sets) for (const name of set.names) {
        if (names.includes(name)) continue; // one registration per name
        const tool = {
          name, title: set.titles?.[name] ?? name.replace(/_/g, " "), description: set.descriptions[name], inputSchema: set.schemas[name],
          // Read-only; results carry third-party names, links and price notes, so they are untrusted content.
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          // MCP-shaped result: the JSON as text plus the same object as structured content.
          execute: async (input: unknown) => { const result = await set.run[name](input); return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: !result.ok }; },
        };
        try { Promise.resolve(mc.registerTool(tool, { signal: controller.signal })).catch(() => {}); names.push(name); } catch { /* a browser that refuses one tool keeps the page as it is */ }
      }
    }).catch(() => {});
    return () => { controller.abort(); for (const name of names) { try { mc.unregisterTool?.(name); } catch { /* already gone */ } } };
  }, []);
  return null;
}
