import {loadJevV16Page} from '../lib/jevbench-page-v16.mjs';
import {JevBenchV16ReleasePage} from './JevBenchV16ReleasePage';
/** Prepared server boundary only; no published route/data/path fallback. The
 * actual release parent supplies approved public bytes and trusted hashes. */
export async function JevBenchV16PublicPage({input}:{input:Parameters<typeof loadJevV16Page>[0]}) {
 const page=await loadJevV16Page(input);
 return <JevBenchV16ReleasePage page={page}/>;
}
