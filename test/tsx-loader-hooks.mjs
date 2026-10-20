import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const LINK = 'stub:next-link';

/** Test-only loader: resolves extensionless relative imports to .tsx/.ts, transpiles TSX/TS, loads JSON as a default export, and stubs next/link. */
export async function resolve(specifier, context, next) {
  if (specifier === 'next/link') return { url: LINK, shortCircuit: true };
  if (context.parentURL === LINK) return next(specifier, { ...context, parentURL: import.meta.url });
  if (specifier.startsWith('.') && !/\.(m?js|json|tsx?)$/.test(specifier)) {
    for (const ext of ['.tsx', '.ts']) {
      const url = new URL(specifier + ext, context.parentURL);
      try { await readFile(url); return { url: url.href, shortCircuit: true }; } catch { /* try the next extension */ }
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url === LINK) return { format: 'module', source: 'import {createElement} from "react";export default function Link({children,...p}){return createElement("a",p,children)}', shortCircuit: true };
  if (/\.tsx?$/.test(url)) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const { outputText } = ts.transpileModule(source, { fileName: url, compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
    return { format: 'module', source: outputText, shortCircuit: true };
  }
  if (url.endsWith('.json') && !context.importAttributes?.type) return { format: 'module', source: `export default ${await readFile(fileURLToPath(url), 'utf8')}`, shortCircuit: true };
  return next(url, context);
}
