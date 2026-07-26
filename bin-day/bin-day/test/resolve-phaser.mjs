// Node resolves the `phaser` package to its source entry, which pulls in a
// native WebGL module. Vite uses the browser bundle. This hook makes the
// tests do the same.
import { pathToFileURL } from 'node:url';

const target = pathToFileURL(
  new URL('../node_modules/phaser/dist/phaser.js', import.meta.url).pathname
).href;

export function resolve(specifier, context, next) {
  if (specifier === 'phaser') return { url: target, shortCircuit: true };
  return next(specifier, context);
}
