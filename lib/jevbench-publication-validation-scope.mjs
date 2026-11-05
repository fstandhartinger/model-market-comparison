import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';

// Visibility checks discard release bundles as soon as they finish. Remember only
// which predecessors actually passed their complete reader in this render. No
// result survives the scope or crosses requests, and failed readers never mark it.
const validations = new AsyncLocalStorage();
const key = (root, revision) => JSON.stringify([path.resolve(root), revision]);

/** @template T @param {() => T} read @returns {T} */
export function withPublicationValidationScope(read) {
  return validations.run({ revisions: new Set(), last: undefined }, read);
}

export function markPublicationValidated(root, revision) {
  validations.getStore()?.revisions.add(key(root, revision));
}

export function isPublicationValidated(root, revision) {
  return validations.getStore()?.revisions.has(key(root, revision)) ?? false;
}

// Ascending board assembly needs its immediately preceding validated bundle. Keep
// only that one bundle, rather than a cache of every historical release.
export function lastValidatedPublication(root, revision) {
  const last = validations.getStore()?.last;
  return last && last.key === key(root, revision) ? last.release : undefined;
}

export function rememberValidatedPublication(root, revision, release) {
  const scope = validations.getStore();
  if (!scope) return;
  markPublicationValidated(root, revision);
  scope.last = { key: key(root, revision), release };
}
