import assert from 'node:assert/strict';

function assertBreakdownCounts(value, path, insideBreakdowns = false) {
  if (!value || typeof value !== 'object') return;
  for (const [name, cell] of Object.entries(value)) {
    const cellPath = `${path}.${name}`;
    const inside = insideBreakdowns || name === 'breakdowns';
    if (inside && Number.isInteger(cell?.n)) {
      assert.ok(cell.n >= 30, `${cellPath}: n=${cell.n}`);
    }
    assertBreakdownCounts(cell, cellPath, inside);
  }
}

export function assertJevbenchRowBreakdownFloor(artifact, surface) {
  for (const row of artifact.systems) {
    assertBreakdownCounts(row, `${surface}: ${row.key}`);
  }
}
