import test from 'node:test';
import assert from 'node:assert/strict';
import {bundle} from '../r198/v180/validate_v180.mjs';
import {validateJevbenchV180Bundle,validateV180Approval} from '../lib/jevbench-v180-release.mjs';
test('v1.8.0 cost restatement and negative controls',()=>assert.equal(validateJevbenchV180Bundle(bundle,{candidate:true}),true));
test('v1.8.0 publication requires a fully bound GO',()=>assert.throws(()=>validateV180Approval({status:'PENDING'})));
