import { createHash } from 'node:crypto';

// Release owner exclusions, stored as hashes so private names never ship to readers.
// v1.7.14 (CR-324): one internal candidate was published as addendum a8 and its hash removed.
const excluded = new Set(['8421608a101442b0b3f452287e5d8a1a17c390738d632632d9bd4032000720e6', '557b3558498974e344f6f302b435ded0f6d40ca774647b089c05c1c669822e4f', '8ececd7f4ca275e8e9bf109e75fef21be3a666983178af5ca2d3e26d618bc281', '4e6ac4c9317205dd896997b1cdca84651bf38a2b1ad2ac9d4b5739887814dda0', 'a6b6bd48bc3f4dc73139283d50dff07b8e8b60978e25a87a21a36dcee13328f4']);
export const isJevbenchV16ExcludedKey = key => ['djev', 'djev-thinking'].includes(key) || excluded.has(createHash('sha256').update(key.toLowerCase()).digest('hex'));
