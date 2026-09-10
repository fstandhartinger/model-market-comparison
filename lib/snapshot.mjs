import { writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// Serialize before touching the destination. All raw-source writers share this path.
export async function writeJSONAtomic(target, snapshot) {
  const body = `${JSON.stringify(snapshot, null, 2)}\n`;
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, body, { flag: "wx" });
    await rename(temporary, target);
  } finally { await rm(temporary, { force: true }); }
}
