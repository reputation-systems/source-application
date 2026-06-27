// Node-safe stub for SvelteKit's `$app/environment`, aliased in by mcp/build.mjs.
// The library's `src/lib/ergo/envs.ts` imports `{ browser }` from this virtual
// SvelteKit module; outside the browser we are never in a browser context.
export const browser = false;
export const dev = false;
export const building = false;
export const version = '0.0.0';
