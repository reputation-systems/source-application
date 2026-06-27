# Source Application — Celaut Service (MCP + REST)

A sealed Celaut microVM that exposes the **full** Source Application on-chain
file-source registry surface over plain HTTP on `0.0.0.0:8080`:

- `GET /health` — liveness probe.
- `* /mcp` — the complete MCP tool surface (Streamable HTTP transport), identical
  to the stdio server in [`../mcp/`](../mcp).
- `* /api/*` — a clean JSON REST mirror of every method (reads via `GET`, writes
  via `POST`).

Reads + pure helpers, writes, the env-configured signer, and the shared MCP tool
registry all live **once** under [`../mcp/`](../mcp); `server-http.mjs` imports
them directly (`../mcp/core.mjs`, `lib.mjs`, `writes.mjs`, `tools.mjs`) — there
are no duplicated copies in `.service/`. The MCP and REST layers call the same
functions, so they never diverge, and the on-chain read logic itself is bundled
from `src/` (see [`../mcp/README.md`](../mcp/README.md)).

The `Dockerfile` preserves this sibling layout inside the sealed microVM
(`/app/service/server-http.mjs` + `/app/mcp/...`) so `../mcp` resolves the same
way in the VM as in local dev. The prebuilt `../mcp/_generated/lib.bundle.mjs` is
copied in, so the VM needs no build toolchain.

## Run locally

```bash
# from ../mcp first: npm install && npm run build:mcp  (provides node_modules + bundle)
npm install
npm start                 # binds 0.0.0.0:8080, imports ../mcp/*
curl localhost:8080/health
```

## Signer modes (env)

Default is **unsigned** — no key ever lives in the VM; writes return an unsigned
EIP-12 transaction for an external wallet (Nautilus/ErgoPay) to sign.

| Mode       | Env                                                                                 |
|------------|-------------------------------------------------------------------------------------|
| `unsigned` | `SOURCE_SIGNER_MODE=unsigned`, `SOURCE_ADDRESS=<P2PK address>` (default)             |
| `seed`     | `SOURCE_SIGNER_MODE=seed`, `SOURCE_MNEMONIC=...`, optional `SOURCE_MNEMONIC_PASSWORD`, `SOURCE_NODE_URI`, `SOURCE_ADDRESS_INDEX` |

Other env: `SOURCE_EXPLORER_API` (default `https://api.ergoplatform.com`),
`PORT` (default `8080`).

## REST routes

Reads (GET):

| Route | Maps to |
|-------|---------|
| `GET /api/config` | type NFT ids + signer mode |
| `GET /api/sources?hash=HASH` | `fetchFileSourcesByHash` |
| `GET /api/sources/by-profile?profileTokenId=ID&limit=N` | `fetchFileSourcesByProfile` |
| `GET /api/sources/:boxId/invalidations` | `fetchInvalidFileSources` |
| `GET /api/unavailable?url=URL` | `fetchUnavailableSources` |
| `GET /api/invalidations/by-profile?profileTokenId=ID&limit=N` | `fetchInvalidFileSourcesByProfile` |
| `GET /api/unavailable/by-profile?profileTokenId=ID&limit=N` | `fetchUnavailableSourcesByProfile` |
| `GET /api/profiles/:profileTokenId/opinions` | `fetchProfileOpinions` |
| `GET /api/profiles/:authorTokenId/opinions-given` | `fetchProfileOpinionsByAuthor` |
| `GET /api/profiles/:profileTokenId` | `loadProfileData` |
| `GET /api/search?hash=HASH` | `searchByHash` |
| `GET /api/hash-algorithms` | `HASH_OPTIONS` |

Writes (POST, signed per `SOURCE_SIGNER_MODE`):

| Route | Body | Maps to |
|-------|------|---------|
| `POST /api/profile` | `{content?}` | `createProfileBox` |
| `POST /api/sources` | `{mainBoxId, fileHash, sourceEntry}` | `addFileSource` |
| `POST /api/sources/confirm` | `{mainBoxId, fileHash, sourceEntry}` | `confirmSource` |
| `POST /api/sources/update` | `{mainBoxId, fileHash, sourceEntry}` | `updateFileSource` (see note) |
| `POST /api/sources/invalidate` | `{mainBoxId, sourceBoxId}` | `markInvalidSource` |
| `POST /api/unavailable` | `{mainBoxId, sourceUrl}` | `markUnavailableSource` |
| `POST /api/profiles/trust` | `{mainBoxId, profileTokenId, isTrusted}` | `trustProfile` |

`sourceEntry` = `{hashFunctionId, contentFormat, contentHash, rawFormat, urlLink, isChunked?}`.

`mainBoxId` is the author's **PROFILE box** id (the box holding their reputation
token); every opinion is split from it.

### Note on `update_file_source`

The original browser flow spends the previous FILE_SOURCE box via
`update_opinion` (a Nautilus-only path). The headless `reputation-system/node`
entry exposes `create_*_with_signer` but **not** `update_opinion_with_signer`, so
here `update_file_source` publishes a **new** FILE_SOURCE opinion carrying the
new content for the same hash; the previous box is left in place (it can be
invalidated separately).

## Type NFT placeholders

`INVALID_FILE_SOURCE_TYPE_NFT_ID`, `UNAVAILABLE_SOURCE_TYPE_NFT_ID`, and
`PROFILE_OPINION_TYPE_NFT_ID` are still PLACEHOLDER (all-zero) values in
`src/lib/ergo/envs.ts`; they are preserved verbatim. Reads against them simply
return empty arrays until the real Type NFTs are minted. `FILE_SOURCE_TYPE_NFT_ID`
and `PROFILE_TYPE_NFT_ID` are real and return live data.
