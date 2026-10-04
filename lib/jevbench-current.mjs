import { readJevbenchV157Release } from './jevbench-v15-release.mjs';

// CR-279: explicit public release pointer, shared by the live page and agent feed.
// Update this pointer as part of a reviewed release; never discover draft files.
export const CURRENT_JEVBENCH_PAGE = '/jev-models/v1.5.7';
export const readCurrentJevbench = readJevbenchV157Release;
