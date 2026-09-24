import { readFile } from "node:fs/promises";
import ts from "typescript";

/** Compile one production TypeScript module for Node 20 tests, which cannot import .ts directly. */
export async function compileTsModule(url, aliases = {}) {
  const source = await readFile(url, "utf8");
  let code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  code = code.replace(/\bfrom\s*(["'])(\.\.?\/[^"']+)\1/g, (match, quote, specifier) => {
    const target = aliases[specifier] ?? new URL(specifier, url).href;
    return `from ${quote}${target}${quote}`;
  });
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}

export async function importTsModule(url, aliases = {}) {
  return import(await compileTsModule(url, aliases));
}
