// CR-817: every published v1.8.11+ release's own All-data input has no small row breakdowns (formerly one copy per
// test/cr-257-v18NN-min-samples.test.mjs; see test/helpers/jevbench-live-floor.mjs).
import test from 'node:test';
import {published, checkAllDataInput} from './helpers/jevbench-live-floor.mjs';

for (const {version} of published) {
 test(`${version}: published All-data input has no small row breakdowns`, t => checkAllDataInput(t, version));
}
