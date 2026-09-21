import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readMultimodalPreview() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json');
  const a = JSON.parse(await readFile(file, 'utf8'));
  if (a.benchmark !== 'JevBench multimodal preview' || a.status !== 'preview' || a.public_real_items !== 128 || a.held_out_items_published !== 0) throw new Error('Invalid multimodal preview artifact');
  if (!Array.isArray(a.systems) || a.systems.length !== 6 || a.systems.some((s) => s.overall.n !== 128)) throw new Error('Invalid multimodal system rows');
  if (a.synthetic.n !== 8 || a.synthetic.rank_worthy !== false) throw new Error('Invalid synthetic split');
  return a;
}
