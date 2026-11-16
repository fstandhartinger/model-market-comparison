import {createHash} from 'node:crypto';
// Private identifiers are represented only by digests. Every window that starts at a token boundary is hashed, so an
// identifier embedded as a prefix (UUID segment, "x-<id>", "<id>_suffix") is still found, as the old substring regex did.
export const privateTokenHashes = {
 "t1": "deb469173a6f1b0a8c44a3ca0e02c764a51f2d331059819a7390a22d308c1087",
 "t2": "b9d4d7b4a1287ed8ec4030204a29c4bdaeadd419787b441e2673c16e79bfc46f",
 "t3": "8210af44b266e614ca2a6e1422dc735e33432448cfeb54802a379a2b19b54bc6"
};
const LENGTHS = [8, 20];
export function privateTokenHits(text) {
 const hits = Object.fromEntries(Object.keys(privateTokenHashes).map(key => [key, 0]));
 const names = new Map(Object.entries(privateTokenHashes).map(([key, hash]) => [hash, key]));
 const word = /[A-Za-z0-9]/;
 for (let i = 0; i < text.length; i++) {
  if (!word.test(text[i]) || (i > 0 && word.test(text[i - 1]))) continue; // window must start at an alphanumeric run start
  for (const len of LENGTHS) {
   if (i + len > text.length) continue;
   const key = names.get(createHash('sha256').update(text.slice(i, i + len)).digest('hex'));
   if (key) hits[key]++;
  }
 }
 return hits;
}
