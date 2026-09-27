// Fable pass 39 (2026-09-27): source pin for the one fix Fable shipped — F-206(d) again: the v1.5 preview's leader line prints
// the sentence `jevV15LeaderSentence` builds (which names the tied systems and appends the artifact's `leader_wording` only
// when it adds words). PR #53 (CR-185) had made the component prefer the artifact's bare wording, so the live hidden preview
// read "joint leaders (statistical tie)" with no names in all four contexts (pass-37 verifier ONLY=F-206: 48/52).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../components/JevBenchV15Preview.tsx', import.meta.url), 'utf8');

test('F-206(d): the leader element renders the built sentence, never the artifact\'s bare leader_wording', () => {
  const el = component.match(/data-bh-jev15-leader>\{([^}]*)\}<\/p>/);
  assert.ok(el, 'the leader element exists and interpolates one expression');
  assert.equal(el[1].trim(), 'leader');
  assert.doesNotMatch(component, /leader_wording \?\? leader/);
  // The sentence itself is still the lib's: names first, the artifact wording appended only if it adds words.
  assert.match(component, /const leader = jevV15LeaderSentence\(a\.board\[headline\]/);
});

test('pass 39: a listing pill is a word, never a key, and an addendum row wears one pill', () => {
  const labels = component.match(/const LISTING_LABEL: Record<string, string> = \{([^}]*)\}/);
  assert.ok(labels, 'the listing label map exists');
  assert.match(labels[1], /honorable_mention: 'honorable mention'/);
  assert.match(labels[1], /addendum: 'addendum'/);
  // The fallback never prints an underscore either.
  assert.match(component, /LISTING_LABEL\[row\.listing\] \?\? row\.listing\.replace\(\/_\/g, ' '\)/);
  // The addendum label pill (`row.addendum.label`) already says it; the listing pill steps aside on those rows.
  assert.match(component, /row\.listing !== 'ranked' && !\(row\.listing === 'addendum' && row\.addendum\) &&/);
});
