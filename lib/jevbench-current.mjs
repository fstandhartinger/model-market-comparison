import { readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { readJevbenchV16Release } from './jevbench-v16-release.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// CR-279: explicit public release pointer, shared by the live page and agent feed.
// Update this pointer as part of a reviewed release; never discover draft files.
// Published artifacts are explicit: never discover drafts or infer availability from filenames.
// Keep old version readers addressable when the current pointer advances.
export const PUBLISHED_BENCHMARK_VERSIONS = Object.freeze({
  jevbench: Object.freeze({
    'v1.6.0': Object.freeze({ page: '/jev-models/v1.6.0', read: readJevbenchV16Release }),
    'v1.6.1': Object.freeze({ page: '/jev-models/v1.6.1', read: readJevbenchV161Release }),
  }),
  imagejevbench: Object.freeze({
    'v0.3.0': Object.freeze({ page: '/image-jev-bench', read: async (root = process.cwd()) => {
      const bytes = await readFile(`${root}/data/imagejev-v03.json`);
      return { artifact: JSON.parse(bytes), sha256: createHash('sha256').update(bytes).digest('hex') };
    } }),
  }),
});

export const CURRENT_JEVBENCH_VERSION = 'v1.6.1';
export const CURRENT_JEVBENCH_PAGE = PUBLISHED_BENCHMARK_VERSIONS.jevbench[CURRENT_JEVBENCH_VERSION].page;
export const readJevbenchVersion = (version, root = process.cwd()) => PUBLISHED_BENCHMARK_VERSIONS.jevbench[version]?.read(root) ?? null;
export const readPublishedBenchmarkVersion = (benchmark, version, root = process.cwd()) => PUBLISHED_BENCHMARK_VERSIONS[benchmark]?.[version]?.read(root) ?? null;
export const readCurrentJevbench = PUBLISHED_BENCHMARK_VERSIONS.jevbench[CURRENT_JEVBENCH_VERSION].read;
