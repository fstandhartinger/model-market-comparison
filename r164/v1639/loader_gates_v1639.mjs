import path from 'node:path';
import {readFileSync} from 'node:fs';
const J=path.dirname(new URL(import.meta.url).pathname),real=path.resolve(J,'../..'),pass=process.env.V1639_PASS||J+'/pass';
const {readOptionalJevbenchV1639Release:readPass}=await import(path.join(pass,'lib/jevbench-v1639-release.mjs'));
const r=await readPass(pass);if(r.artifact.systems.length!==75+Object.keys(JSON.parse(readFileSync(J+'/batch/ROWS.json'))).length)throw Error('PASS roster');console.log('PASS loader VALID',r.sha256);
const {readOptionalJevbenchV1639Release:readReal}=await import(path.join(real,'lib/jevbench-v1639-release.mjs'));
try{await readReal(real);throw Error('unexpected acceptance')}catch(e){if(!/independent release review/.test(e.message))throw e;console.log('REAL PENDING rejection:',e.message)}
