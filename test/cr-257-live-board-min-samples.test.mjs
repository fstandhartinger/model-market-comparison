// CR-817: the JevBench live board has no small row breakdowns (shared check, see test/helpers/jevbench-live-floor.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR_FROM, releases, checkLiveBoard} from './helpers/jevbench-live-floor.mjs';

test('release discovery finds the v1.8.11+ publication manifests without gaps', () => {
 assert.ok(releases.length >= 6, `found ${releases.map(r => r.version).join(', ')}`);
 assert.deepEqual(releases.map(r => r.minor), releases.map((_, i) => FLOOR_FROM + i));
});

test('published live board has no small row breakdowns and is restated by the newest PASS release', t => checkLiveBoard(t));
