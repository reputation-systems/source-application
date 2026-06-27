# Source Application — MCP server (stdio)

A full-surface [MCP](https://modelcontextprotocol.io) server over **stdio** for
the Source Application on-chain file-source registry. Any MCP-aware client
(Claude, IDEs, agents) can read the registry AND publish to it.

```bash
npm install
npm run build:mcp    # bundle the read surface from src/ (regenerate the bundle)
npm run mcp          # speaks MCP over stdio
```

## Reads reuse `src/` — they are not re-implemented

The read layer (Explorer box queries, R9 parsing, the `fetch*` reads, the pure
aggregation helpers, the hash helpers, and the Type NFT ids) lives **once**, in
`src/lib/ergo/*`. `npm run build:mcp` runs [esbuild](https://esbuild.github.io)
over `_entry.mjs` to compile that TypeScript into a single Node-loadable ESM
module, `_generated/lib.bundle.mjs`. `core.mjs` is then a thin adapter that
re-exports the bundle and defaults `explorerUri`. Change a read in `src/`, rerun
`build:mcp`, and it flows through here, the stdio server, and the `.service`
alike — no second copy to drift.

The published `dist/` is not bare-Node loadable (extensionless relative imports,
the `reputation-system` Svelte entry, a `dompurify` DOM dep), so the build
rewrites those browser-only edges:

| Import | Resolved to | Why |
|--------|-------------|-----|
| `reputation-system` | `reputation-system/node` (kept **external**) | the headless entry exporting `searchBoxes` / `getTimestampFromBlockId`; external so reads resolve the SAME installed package that `writes.mjs` uses at runtime (no drift, no tx-builder graph inlined) |
| `$app/environment` | `_stubs/app-environment.mjs` (`browser = false`) | SvelteKit virtual module, absent in Node |
| `dompurify` | `_stubs/dompurify.mjs` (passthrough) | only used for display-safety before `JSON.parse`; the MCP/REST consumer is an agent, not a DOM — see the stub comment |

Everything else (our `src`, plus the pure `@scure`/`@noble` helpers actually
reached) is inlined, so the bundle is self-contained apart from
`reputation-system/node`.

## Layout

| File | Role |
|------|------|
| `_entry.mjs` | esbuild entry — re-exports the read surface straight from `../src/lib/ergo/*`. |
| `build.mjs` | esbuild build (`npm run build:mcp`) → `_generated/lib.bundle.mjs`. |
| `_generated/lib.bundle.mjs` | **generated** (committed) Node bundle of the `src/` read logic. |
| `_stubs/` | Node-safe aliases for `$app/environment` and `dompurify`. |
| `core.mjs` | thin adapter over the bundle: re-exports helpers/constants, defaults `explorerUri`. |
| `lib.mjs` | `makeSigner()` (seed/unsigned from env), `fetchMainBox()`, `describeResult()`. |
| `writes.mjs` | write surface via `reputation-system/node`'s `create_*_with_signer` (necessary Node signer glue — `sourceStore.ts` is browser-`ergo`-bound and can't be reused). |
| `tools.mjs` | shared MCP tool registry (TOOLS + HANDLERS), also used by `../.service`. |
| `server.mjs` | stdio bootstrap. |

The Streamable-HTTP + REST twin lives in [`../.service`](../.service) and imports
these same `core/lib/writes/tools` modules directly (no copies).

## Signer modes (env)

Default **unsigned** — no key; writes return an unsigned EIP-12 tx.

- `SOURCE_SIGNER_MODE=unsigned` (default) + `SOURCE_ADDRESS=<P2PK address>`
- `SOURCE_SIGNER_MODE=seed` + `SOURCE_MNEMONIC=...` (optional
  `SOURCE_MNEMONIC_PASSWORD`, `SOURCE_NODE_URI`, `SOURCE_ADDRESS_INDEX`)
- `SOURCE_EXPLORER_API` (default `https://api.ergoplatform.com`)

## Tools (27)

**Info:** `get_source_config`

**Reads:** `fetch_file_sources_by_hash`, `fetch_invalid_file_sources`,
`fetch_unavailable_sources`, `fetch_profile_opinions`,
`fetch_file_sources_by_profile`, `fetch_invalid_file_sources_by_profile`,
`fetch_unavailable_sources_by_profile`, `fetch_profile_opinions_by_author`,
`search_by_hash`, `load_profile_data`

**Pure helpers:** `group_by_download_source`, `group_by_profile`,
`calculate_profile_trust`, `aggregate_source_score`, `get_primary_url`,
`get_all_urls`, `list_hash_algorithms`, `validate_hash`, `compute_hash`

**Writes (signer per `SOURCE_SIGNER_MODE`):** `create_profile_box`,
`add_file_source`, `confirm_source`, `update_file_source`, `mark_invalid_source`,
`mark_unavailable_source`, `trust_profile`

See [`../.service/README.md`](../.service/README.md) for the write→opinion
mapping and the `update_file_source` caveat.
