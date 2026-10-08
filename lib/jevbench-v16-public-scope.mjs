import { createHash } from 'node:crypto';

// Release owner exclusions, stored as hashes so private names never ship to readers.
// CR-324/CR-336: adopted public candidates are removed after frozen-score release review.
const excluded = new Set(['8421608a101442b0b3f452287e5d8a1a17c390738d632632d9bd4032000720e6']);
// The frozen v1.6.0 catalogue keeps the exclusions from its original release.
export const isJevbenchV16ExcludedKey = (key, revision = 'v1.6.1') => ['djev', 'djev-thinking'].includes(key)
  || excluded.has(createHash('sha256').update(key.toLowerCase()).digest('hex'))
  || (revision === 'v1.6.0' && ['janus-4b', 'evalengine-decision-4b', 'decider-12b', 'decider-12b-v1'].includes(key));
