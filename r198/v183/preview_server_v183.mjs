import next from 'next';import {createServer} from 'node:http';
const app=next({dev:false,hostname:'127.0.0.1'});await app.prepare();const handler=app.getRequestHandler();const server=createServer((req,res)=>handler(req,res));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));console.log('PREVIEW_READY '+server.address().port);
process.stdin.once('data',async()=>{server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));await app.close();process.exitCode=0;});
