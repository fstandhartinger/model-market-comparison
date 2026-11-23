import { resolve as resolveTsx, load } from './tsx-loader-hooks.mjs';
export { load };
export function resolve(specifier, context, next) {
  // Next's bundler accepts extensionless entry points; native ESM needs the .js suffix.
  return resolveTsx(specifier === 'next/dynamic' ? 'next/dynamic.js' : specifier, context, next);
}
