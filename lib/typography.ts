// CR-72.1 (Florian 2026-09-17): headline sentences must never leave their last word alone on a
// line in mobile portrait. Joining the final two words with a non-breaking space makes a
// one-word last line impossible at any width or text scale, without a handset-specific line
// break. The character is a space to assistive tech and to text search, so the approved copy
// is unchanged; `text-wrap: balance` (globals.css) then distributes the remaining lines.
export const NBSP = "\u00A0";

export function noWidow(text: string): string {
  return text.replace(/\s+(\S+)\s*$/, `${NBSP}$1`);
}
