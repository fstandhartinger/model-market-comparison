import {loadJevV16PageWithCarry} from '../lib/jevbench-page-v16-carry.mjs';
import {JevBenchV16CarryReleasePage} from './JevBenchV16CarryReleasePage';
/** Prepared server boundary only; no published route/data/path fallback. The
 * actual release parent supplies approved public bytes and trusted hashes. */
export async function JevBenchV16CarryPublicPage({input,initialSearch=""}:{input:Parameters<typeof loadJevV16PageWithCarry>[0];initialSearch?:string}) {
 const page=await loadJevV16PageWithCarry(input);
 return <JevBenchV16CarryReleasePage page={page} initialSearch={initialSearch}/>;
}
