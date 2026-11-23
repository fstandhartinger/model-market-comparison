/** F-206: how many adjacent pairs the paired bootstrap cannot separate. Counts markers, never rows: a board with no
 *  markers reports `pairs: 0`, so the page can say the intervals are not in the data file yet instead of claiming "0 ties". */
export function jevV15TieSummary(board) {
  const markers = Array.isArray(board?.markers) ? board.markers : [];
  return { ties: markers.filter((m) => m?.tie === true).length, pairs: markers.length };
}

/** F-206: the systems the headline sentence may call joint leaders — the rank 1/2 tie marker, extended to rank 3 only
 *  when rank 3 is itself tied with rank 2. Returns `tie: false` with the single leader when the top pair is separated. */
export function jevV15LeaderKeys(board) {
  const order = Array.isArray(board?.order) ? board.order : [];
  const markers = Array.isArray(board?.markers) ? board.markers : [];
  if (order.length < 2) return null;
  const between = (upper, lower) => markers.find((m) => m?.upper === upper && m?.lower === lower) ?? null;
  const top = between(order[0], order[1]);
  if (!top) return null;
  if (!top.tie) return { tie: false, keys: [order[0]], runnerUp: order[1] };
  const keys = [order[0], order[1]];
  if (order.length > 2 && between(order[1], order[2])?.tie) keys.push(order[2]);
  return { tie: true, keys, runnerUp: null };
}

const WORDS = (text) => new Set((String(text).toLowerCase().match(/[a-z0-9.%]+/g) ?? []).filter((w) => w.length >= 3));

/** F-206: the leader line names its systems instead of reading "joint leaders" with no subject. `nameOf` maps a system key
 *  to its display name; the artifact's own `leader_wording` is appended only when it carries a word the sentence lacks. */
export function jevV15LeaderSentence(board, nameOf) {
  const leaders = jevV15LeaderKeys(board);
  if (!leaders) return null;
  const label = (key) => String(nameOf(key) ?? key);
  let sentence;
  if (leaders.tie) {
    const names = leaders.keys.map(label);
    sentence = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are joint leaders (statistical tie).`;
  } else {
    sentence = `${label(leaders.keys[0])} leads: its paired-bootstrap interval against ${label(leaders.runnerUp)} excludes zero, so first place is not a statistical tie.`;
  }
  const wording = board?.leader_wording;
  if (wording) {
    const have = WORDS(sentence);
    if ([...WORDS(wording)].some((w) => !have.has(w))) {
      const trimmed = String(wording).trim();
      sentence += ` ${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}${/[.!?]$/.test(trimmed) ? '' : '.'}`;
    }
  }
  return sentence;
}
