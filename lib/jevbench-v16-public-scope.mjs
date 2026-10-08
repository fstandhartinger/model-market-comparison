import { createHash } from 'node:crypto';

// Release owner exclusions, stored as hashes so private names never ship to readers.
// CR-324/CR-336: adopted public candidates are removed after frozen-score release review.
const excluded = new Set(['8421608a101442b0b3f452287e5d8a1a17c390738d632632d9bd4032000720e6', '557b3558498974e344f6f302b435ded0f6d40ca774647b089c05c1c669822e4f', '8ececd7f4ca275e8e9bf109e75fef21be3a666983178af5ca2d3e26d618bc281']);
// The frozen v1.6.0 catalogue keeps the exclusions from its original release.
export const isJevbenchV16ExcludedKey = (key, revision = 'v1.6.1') => ['djev', 'djev-thinking'].includes(key)
  || excluded.has(createHash('sha256').update(key.toLowerCase()).digest('hex'))
  || (revision === 'v1.6.0' && ['janus-4b', 'evalengine-decision-4b'].includes(key));
