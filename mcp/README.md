# Source Application — MCP server (stdio)

A full-surface [MCP](https://modelcontextprotocol.io) server over **stdio** for
the Source Application on-chain file-source registry. Any MCP-aware client
(Claude, IDEs, agents) can read the registry AND publish to it.

```bash
npm install
npm run mcp          # speaks MCP over stdio
```

## Layout

| File | Role |
|------|------|
| `core.mjs` | framework-agnostic reads + pure helpers + Type NFT ids (no Svelte). Port of `src/lib/ergo/sourceFetch.ts` + `sourceObject.ts`. |
| `lib.mjs` | `makeSigner()` (seed/unsigned from env), `fetchMainBox()`, `describeResult()`. |
| `writes.mjs` | write surface (port of `src/lib/ergo/sourceStore.ts`) via `reputation-system/node`'s `create_*_with_signer`. |
| `tools.mjs` | shared MCP tool registry (TOOLS + HANDLERS), also used by `../.service`. |
| `server.mjs` | stdio bootstrap. |

The Streamable-HTTP + REST twin lives in [`../.service`](../.service) and reuses
the same `core/lib/writes/tools` modules.

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
