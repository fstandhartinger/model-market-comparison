// F-207(b) (Fable pass 38, decision 1): a label's marker must not look like a datum. On a chart whose
// marks are discs, a disc beside a label is a sixth mark — so the tie between a top-five label and the
// sphere it names is a ring drawn around the datum itself, and when the D216 declump pushed the plate
// clear of its sphere, a leader says which sphere the plate belongs to.
//
// The geometry lives here because both render paths need exactly the same rule: the WebGL overlay
// (DOM divs over the canvas) and the projected SVG fallback. It is pure, so it is tested directly
// rather than pinned as component source text.

/** Ring 4 px outside the sphere's projected radius, clamped to a readable 14–32 px across. */
export const HALO_GAP = 4, HALO_MIN = 14, HALO_MAX = 32;
/** A leader is drawn only once the plate is further than this from the ring's edge. */
export const LEADER_AFTER = 24;

export function haloDiameter(projectedRadius) {
  return Math.max(HALO_MIN, Math.min(HALO_MAX, 2 * (projectedRadius + HALO_GAP)));
}

/**
 * The leader from the plate's nearest edge midpoint to the ring's edge, or `null` while the plate is
 * still beside its own sphere. `plate` is the label box in the same pixel space as the ring's centre.
 * @param {{ x: number, y: number, w: number, h: number }} plate
 * @returns {{ x: number, y: number, length: number, angle: number, to: { x: number, y: number } } | null}
 */
export function leaderTo(plate, cx, cy, diameter) {
  const mids = [
    { x: plate.x + plate.w / 2, y: plate.y },
    { x: plate.x + plate.w / 2, y: plate.y + plate.h },
    { x: plate.x, y: plate.y + plate.h / 2 },
    { x: plate.x + plate.w, y: plate.y + plate.h / 2 },
  ];
  let from = mids[0], distance = Infinity;
  for (const mid of mids) {
    const d = Math.hypot(cx - mid.x, cy - mid.y);
    if (d < distance) { distance = d; from = mid; }
  }
  const length = distance - diameter / 2;
  if (!(length > LEADER_AFTER)) return null;
  return { x: from.x, y: from.y, length, angle: (Math.atan2(cy - from.y, cx - from.x) * 180) / Math.PI,
    to: { x: from.x + (cx - from.x) * (length / distance), y: from.y + (cy - from.y) * (length / distance) } };
}
