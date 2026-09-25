import type { ReactNode } from 'react';

// F-182: our own copy uses words, not keys. A *sourced* string — a model-card note, a published cost
// basis — may still name a field; it is set in code type, never as prose. The pass-34 checker reads
// the hub's text nodes outside `<code>`, so this is the accepted way to carry a quoted field name.
export const JEV_FIELD_NAMES = /(max_seq_len|long_policy|usage\.input_tokens)/g;

export function withFieldNames(text: string): ReactNode[] {
  return text.split(JEV_FIELD_NAMES).map((part, index) => index % 2 === 1 ? <code key={index}>{part}</code> : part);
}
