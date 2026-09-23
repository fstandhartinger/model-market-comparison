// Fable pass 33 (2026-09-23) — source pins for the surgical fix Fable shipped itself.
// F-176(a): once the interactive 3D view is up it announces nothing; the live region keeps only the loading and failure states.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../components/JevCapability3D.tsx', import.meta.url), 'utf8');

test('F-176(a): the 3D view has no "ready" announcement', () => {
  assert.equal(src.includes('Interactive 3D view ready.'), false, 'the ready sentence is gone');
  assert.match(src, /setStatus\(''\)/, 'the ready state clears the live region');
  assert.match(src, /Loading the interactive 3D view/, 'the loading state stays');
  assert.match(src, /could not (load|create) the interactive 3D view/, 'the failure states stay');
});
