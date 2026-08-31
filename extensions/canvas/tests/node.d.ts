/**
 * The suite is typed for the browser (`types: []`), and one test reads a source
 * file off disk: this is the one Node door it needs, declared by hand rather
 * than pulling in all of `@types/node` for a single call.
 */
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
}
