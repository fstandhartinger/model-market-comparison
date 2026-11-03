// Shared invariant for tests that pin a draw's release history. The list grows with every release,
// so a test owns only the prefix up to its own release; later releases may be appended freely.
const semver=v=>{const m=/^v(\d+)\.(\d+)\.(\d+)$/.exec(v);if(!m)throw new Error(`not a release id: ${v}`);return m.slice(1).map(Number);};
export const compareReleases=(a,b)=>{const x=semver(a),y=semver(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;};
export function assertReleaseHistory(assert,draw,prefix){
 const r=draw.releases;
 assert.ok(Array.isArray(r)&&r.length>=prefix.length,'release history is shorter than the prefix this test owns');
 assert.deepEqual(r.slice(0,prefix.length),prefix);
 assert.equal(new Set(r).size,r.length,'releases are unique');
 for(let i=1;i<r.length;i++)assert.ok(compareReleases(r[i-1],r[i])<0,`releases ascend: ${r[i-1]} < ${r[i]}`);
 assert.equal(draw.latest_release,r.at(-1));
}
