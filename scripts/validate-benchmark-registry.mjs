#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { validateBenchmarkRegistry } from '../lib/benchmark-registry.mjs';

const root = new URL('../', import.meta.url);
const registry = validateBenchmarkRegistry(JSON.parse(await readFile(new URL('data/raw/benchmarks/registry.json', root), 'utf8')));
// Evidence paths are repo-relative; validation never fetches or executes a recipe.
const checked = new Map();
for (const e of registry.entries) for (const source of e.evidence) {
  const path = resolve(root.pathname, source.file);
  if (!path.startsWith(root.pathname)) throw new Error(`Evidence escapes repository: ${source.file}`);
  if (!checked.has(path)) checked.set(path, createHash('sha256').update(await readFile(path)).digest('hex'));
  if (checked.get(path) !== source.sha256) throw new Error(`Evidence hash mismatch: ${e.id}: ${source.file}`);
}
console.log(`Registry: ${registry.entries.length} versioned entries, ${registry.aa_field_map.length} AA field mappings, ${checked.size} verified evidence files`);
