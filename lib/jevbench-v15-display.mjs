export const JEVBENCH_V15_OPTIONS = ['A', 'B', 'C'];
export const JEVBENCH_V15_AXES = ['intelligence', 'calibration', 'speed', 'cost'];
export const JEVBENCH_V15_TYPES = ['choice', 'noul', 'score'];
const JEVBENCH_V15_DOCS = 'https://github.com/fstandhartinger/jevbench/blob/main/docs';
export const JEVBENCH_V15_METHOD_LINKS = Object.freeze([
  { label: 'Frozen scoring method', filename: 'METHOD-v1.5.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5.md` },
  { label: 'Pricing rules', filename: 'METHOD-v1.5-ADDENDUM-PRICING.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING.md` },
  { label: 'Pricing interpretation', filename: 'METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md` },
  { label: 'Equal-axis, equal-type headline amendment', filename: 'METHOD-v1.5-ADDENDUM-HEADLINE-A-EQUAL-TYPES.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-HEADLINE-A-EQUAL-TYPES.md` },
  { label: 'Addendum placement and What-If interpretation', filename: 'METHOD-v1.5-ADDENDUM-PLACEMENT-INTERPRETATION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PLACEMENT-INTERPRETATION-1.md` },
  { label: 'DeepInfra pricing disclosure correction', filename: 'METHOD-v1.5-ADDENDUM-PRICING-DEEPINFRA-DISCLOSURE-CORRECTION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-DEEPINFRA-DISCLOSURE-CORRECTION-1.md` },
  { label: 'Imajev-4B pricing application (original wording)', filename: 'METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-1.md` },
  { label: 'Imajev-4B pricing application (corrected disclosure)', filename: 'METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-2.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-2.md` },
]);
export const JEVBENCH_V15_METHOD_URL = JEVBENCH_V15_METHOD_LINKS[0].url;
export const JEVBENCH_V15_PRICING_URL = JEVBENCH_V15_METHOD_LINKS[1].url;
export const JEVBENCH_V15_HEADLINE_METHOD_URL = JEVBENCH_V15_METHOD_LINKS[3].url;
export { jevV15LeaderSentence, jevV15TieSummary } from './jevbench-board-wording.mjs';
