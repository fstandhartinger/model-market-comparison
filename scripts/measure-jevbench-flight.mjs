// Helper for measure-jevbench-pageweight.mjs. Next's bundled Flight serializer counts shared props once.
// Run with --conditions=react-server and NODE_ENV=production; stdin is a local v8-serialized prop graph.
import { readFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { createRequire } from 'node:module';
import React from 'react';
const require = createRequire(import.meta.url);
const { registerClientReference, renderToReadableStream } = require('next/dist/compiled/react-server-dom-webpack/server.node');
const entries = deserialize(readFileSync(0));
const manifest = {};
const elements = entries.map(([name, props], i) => {
  const id = `measurement/${name}`;
  manifest[id] = { id, name: 'default', chunks: [], async: false };
  const ref = registerClientReference(() => null, id, 'default');
  return React.createElement(ref, { ...props, key: i });
});
let failed = false;
const stream = await renderToReadableStream(React.createElement(React.Fragment, null, elements), manifest, { onError(error) { failed = true; console.error(error.message); } });
let bytes = 0;
for await (const chunk of stream) bytes += chunk.length;
if (failed) process.exitCode = 1;
else console.log(bytes);
