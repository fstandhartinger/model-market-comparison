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

// F-210: the roster addendum is a table, and the frozen-order caveat is said once, in the section intro.
// The pin sits on the Addendum component's own source: the placements and the intervals are columns, and no row
// re-states the caveat. Pixels and row heights are the live verifier's job (group F-210).
const addendum = component.slice(component.indexOf('function Addendum('), component.indexOf('function NotRanked('));

test('F-210: the roster addendum renders a table, not a list of paragraphs', () => {
  assert.ok(addendum.length > 200, 'the Addendum component was found');
  assert.match(addendum, /<table className="w-full min-w-\[640px\] text-sm" data-bh-jev15-addendum-table/);
  assert.match(addendum, /<div className="mt-3 overflow-x-auto rounded-xl border border-line">/);
  assert.doesNotMatch(addendum, /<ul/, 'the six paragraphs are gone');
  // Five columns in this order: the system, then the placement and the score for each option.
  const ths = [...addendum.matchAll(/<Th[^>]*>([^<]+)<\/Th>/g)].map((m) => m[1].trim());
  assert.deepEqual(ths, ['System', 'Would place (A)', 'A score · 95% CI', 'Would place (B)', 'B score · 95% CI']);
  // The long form lives in the heading's title, so the column head itself stays one line.
  assert.match(addendum, /Placement against the frozen v1\.5\.0 base under the \$\{o === 'A' \? 'official A' : 'secondary B'\} weights/);
  assert.match(addendum, /const CI_TITLE = '95% paired-bootstrap interval'/);
});

test('F-210: the caveat is said once in the intro, and never inside a row', () => {
  const intro = addendum.match(/<p className="bh-muted mt-1 text-sm">([^<]*)<\/p>/);
  assert.ok(intro, 'the intro paragraph is still there');
  assert.match(intro[1], /stay outside the v1\.5\.0 order and its tie markers/);
  assert.equal(intro[1].trim().split('. ').length, 4, 'the intro keeps its four sentences');
  // `not_ranked_because` repeats the placement and the caveat per row; it is a title, never visible cell text.
  assert.match(addendum, /title=\{r\.not_ranked_because \?\? undefined\}/);
  const body = addendum.slice(addendum.indexOf('<tbody>'), addendum.indexOf('</tbody>'));
  for (const phrase of [/would place/i, /stay outside/i, /frozen base/i]) assert.doesNotMatch(body, phrase);
  assert.match(addendum, /Score followed by its 95% interval\. Placements compare point estimates with the frozen base only\./);
});
