import test from 'node:test';
import assert from 'node:assert/strict';
import {assertReleaseHistory,compareReleases} from './release-history.mjs';
const prefix=['v1.8.2','v1.8.3'];
const ok=(releases,latest=releases.at(-1))=>assertReleaseHistory(assert,{releases,latest_release:latest},prefix);
test('accepts appended later releases',()=>{ok(prefix);ok([...prefix,'v1.8.10']);ok(['v1.8.2','v1.8.3','v1.9.0','v2.0.0']);});
test('rejects a lost release, bad order, duplicates and a stale latest',()=>{
 assert.throws(()=>ok(['v1.8.2']));
 assert.throws(()=>ok(['v1.8.2','v1.8.4']));
 assert.throws(()=>ok([...prefix,'v1.8.3']));
 assert.throws(()=>ok([...prefix,'v1.8.4','v1.8.3']));
 assert.throws(()=>ok([...prefix,'v1.8.4'],'v1.8.3'));
});
test('compares numerically',()=>{assert.ok(compareReleases('v1.8.9','v1.8.10')<0);});
