"use client";
import { useEffect } from "react";

/** CR-56 (Florian 2026-09-16): read-only WebMCP tools for browser agents. Nothing renders and nothing loads unless the
 *  browser exposes `navigator.modelContext.registerTool` in the top-level page (no shim, no cross-origin frames). The
 *  tools only call this site's public GET APIs; unmounting aborts the registration. */
type ModelContext = { registerTool: (tool: object, options?: { signal?: AbortSignal }) => unknown; unregisterTool?: (name: string) => unknown };

export function WebMcpTools() {
  useEffect(() => {
    const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!mc || typeof mc.registerTool !== "function" || window.top !== window.self) return;
    const controller = new AbortController();
    const names: string[] = [];
    import("../lib/webmcp-tools.mjs").then(({ createWebMcpTools, WEBMCP_TOOL_SCHEMAS, WEBMCP_TOOL_DESCRIPTIONS }) => {
      if (controller.signal.aborted) return;
      const get = async (path: string) => {
        const response = await fetch(path, { credentials: "omit", headers: { accept: "application/json" } });
        if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
        return response.json();
      };
      const tools = createWebMcpTools(get) as Record<string, (input: unknown) => Promise<{ ok: boolean }>>;
      for (const name of Object.keys(WEBMCP_TOOL_SCHEMAS) as (keyof typeof WEBMCP_TOOL_SCHEMAS)[]) {
        const tool = {
          name, title: name.replace(/_/g, " "), description: WEBMCP_TOOL_DESCRIPTIONS[name], inputSchema: WEBMCP_TOOL_SCHEMAS[name],
          annotations: { readOnlyHint: true },
          // MCP-shaped result: the JSON as text plus the same object as structured content.
          execute: async (input: unknown) => { const result = await tools[name](input); return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: !result.ok }; },
        };
        try { Promise.resolve(mc.registerTool(tool, { signal: controller.signal })).catch(() => {}); names.push(name); } catch { /* a browser that refuses one tool keeps the page as it is */ }
      }
    }).catch(() => {});
    return () => { controller.abort(); for (const name of names) { try { mc.unregisterTool?.(name); } catch { /* already gone */ } } };
  }, []);
  return null;
}
