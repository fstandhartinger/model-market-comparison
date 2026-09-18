// F-124 (Fable pass 23): a commit-like identity (`aa-terminal-bench-hard::74221fb`) is a pinned
// revision of the benchmark's own repository, not a version its maintainer published — "Version
// 74221FB" reads as nonsense to a reader. Its own module so the table (`.mjs`) and the copy
// helpers (`.ts`) share one rule.
//
// A pure-digit string is never a pin: roughly one short git hash in twenty has no letter, and a
// version like `20260918` would be misread as one.
export const isPin = (version) => /^[0-9a-f]{6,40}$/i.test(String(version ?? '')) && /[a-f]/i.test(String(version));
