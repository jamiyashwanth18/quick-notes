// Vitest's test environment runs on Node.js, which exposes the `global` object
// (an alias for `globalThis`) at runtime. The frontend's tsconfig only includes
// browser/DOM lib types, so TypeScript does not otherwise know about it.
// Declaring it here lets test files reference `global` (e.g. to stub `global.Blob`)
// without pulling in the full @types/node lib for the rest of the app.
declare const global: typeof globalThis;
