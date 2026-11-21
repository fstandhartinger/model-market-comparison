// CR-817: the published board-open All-data input has no small row breakdowns (one live surface per file, so the uncached
// board assemblies run in parallel; see test/helpers/jevbench-live-floor.mjs).
import test from 'node:test';
import {checkAllDataInput} from './helpers/jevbench-live-floor.mjs';

test('board-open: published All-data input has no small row breakdowns', t => checkAllDataInput(t, 'board-open'));
