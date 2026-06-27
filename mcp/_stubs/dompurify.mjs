// Node-safe stub for `dompurify`, aliased in by mcp/build.mjs.
//
// `src/lib/ergo/sourceFetch.ts` calls `DOMPurify.sanitize(rawContent)` purely as
// a DISPLAY-safety measure before the R9 string is JSON-parsed into a SourceEntry.
// The MCP/REST consumer is an agent, not a DOM — there is no XSS surface here, and
// the sanitized string is only ever passed to `JSON.parse`, never rendered. So a
// passthrough is correct and avoids dragging a DOM polyfill (jsdom) into the VM.
//
// If a future read path emits HTML to a browser, swap this alias for
// `isomorphic-dompurify` instead.
const DOMPurify = { sanitize: (input) => input };
export default DOMPurify;
export const sanitize = DOMPurify.sanitize;
