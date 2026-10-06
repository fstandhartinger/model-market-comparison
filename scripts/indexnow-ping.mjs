#!/usr/bin/env node
/** After the key file and sitemap are deployed: node scripts/indexnow-ping.mjs
 * Optional --dry-run prints the request without sending. Never run before deployment.
 * Reads the deployed sitemap, so the submitted URLs exactly match the published site.
 */
const host = 'benchmarkheaven.com';
const key = '5f2b9fe4481e0b340d9f9c1fe497edb4';
const response = await fetch('https://' + host + '/sitemap.xml');
if (!response.ok) throw new Error('Sitemap HTTP ' + response.status);
const xml = await response.text();
const urlList = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')).filter((url) => new URL(url).host === host && new URL(url).pathname.startsWith('/jev-models')))];
if (!urlList.length) throw new Error('No JevBench sitemap URLs');
const body = {host,key,keyLocation:'https://' + host + '/' + key + '.txt',urlList};
if (process.argv.includes('--dry-run')) console.log(JSON.stringify(body,null,2));
else {
 const result = await fetch('https://api.indexnow.org/indexnow', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 console.log('IndexNow HTTP',result.status,await result.text());
 if (!result.ok) process.exitCode = 1;
}
