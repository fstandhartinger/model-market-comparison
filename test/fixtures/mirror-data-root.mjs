// Test helper: symlink every entry of src into dst, descending only where a skipped path lies below. Used to build an isolated site root that still has the
// whole data/ tree (the live board needs draw equating, cohort files, ...) minus the files a test replaces (e.g. the addenda registry) and the v1.7 folder.
import { mkdir, symlink, readdir } from 'node:fs/promises';
import path from 'node:path';

export async function mirrorDataRoot(src, dst, skip, rel = []) {
  await mkdir(dst, { recursive: true });
  for (const e of await readdir(src)) {
    const here = [...rel, e];
    if (skip.some((p) => p.join('/') === here.join('/'))) continue;
    if (skip.some((p) => p.join('/').startsWith(here.join('/') + '/'))) await mirrorDataRoot(path.join(src, e), path.join(dst, e), skip, here);
    else await symlink(path.join(src, e), path.join(dst, e));
  }
}
