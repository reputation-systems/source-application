/**
 * Source Application registry — THIN Node adapter over the library's own logic.
 *
 * There is NO re-implementation here. The read layer (Explorer box queries, R9
 * parsing, the `fetch*` reads, the pure aggregation helpers, the hash helpers and
 * the Type NFT ids) lives ONCE in `src/lib/ergo/*` and is compiled to a single
 * Node-loadable ESM module — `_generated/lib.bundle.mjs` — by `mcp/build.mjs`
 * (run `npm run build:mcp`). This file only:
 *
 *   1. re-exports the pure helpers + constants verbatim from that bundle, and
 *   2. wraps the chain reads to default `explorerUri` to SOURCE_EXPLORER_API,
 *      since the library functions take `explorerUri` as a required argument.
 *
 * Reuse instead of duplication is the whole point: change a read in `src/` and a
 * rebuild flows it through here, the stdio server and the HTTP `.service` alike.
 */
import * as lib from './_generated/lib.bundle.mjs';

export const DEFAULT_EXPLORER_API =
  (typeof process !== 'undefined' && process.env && process.env.SOURCE_EXPLORER_API) ||
  'https://api.ergoplatform.com';

// ── Type NFT ids + supply (from src/lib/ergo/envs.ts) ───────────────────────
export const PROFILE_TYPE_NFT_ID = lib.PROFILE_TYPE_NFT_ID;
export const PROFILE_TOTAL_SUPPLY = lib.PROFILE_TOTAL_SUPPLY;
export const FILE_SOURCE_TYPE_NFT_ID = lib.FILE_SOURCE_TYPE_NFT_ID;
export const INVALID_FILE_SOURCE_TYPE_NFT_ID = lib.INVALID_FILE_SOURCE_TYPE_NFT_ID;
export const UNAVAILABLE_SOURCE_TYPE_NFT_ID = lib.UNAVAILABLE_SOURCE_TYPE_NFT_ID;
export const PROFILE_OPINION_TYPE_NFT_ID = lib.PROFILE_OPINION_TYPE_NFT_ID;

// ── R9 (de)serialization + byte helper (src/lib/ergo/{sourceObject,utils}.ts) ─
export const serializeSourceEntry = lib.serializeSourceEntry;
export const deserializeSourceEntry = lib.deserializeSourceEntry;
export const hexToUtf8 = lib.hexToUtf8;

// ── Pure aggregation helpers (verbatim, src/lib/ergo/sourceObject.ts) ────────
export const getPrimaryUrl = lib.getPrimaryUrl;
export const getAllUrls = lib.getAllUrls;
export const groupByDownloadSource = lib.groupByDownloadSource;
export const groupByProfile = lib.groupByProfile;
export const calculateProfileTrust = lib.calculateProfileTrust;
export const aggregateSourceScore = lib.aggregateSourceScore;

// ── Hash helpers (verbatim, src/lib/ergo/hashUtils.ts) ───────────────────────
export const HASH_ALGORITHMS = lib.HASH_ALGORITHMS;
export const HASH_OPTIONS = lib.HASH_OPTIONS;
export const SEARCH_HASH_ALGORITHMS = lib.SEARCH_HASH_ALGORITHMS;
export const computeHash = lib.computeHash;
export const validateHash = lib.validateHash;
export const normalizeHashAlgorithmId = lib.normalizeHashAlgorithmId;
export const getAlgorithmLabel = lib.getAlgorithmLabel;

// ── Reads (src/lib/ergo/sourceFetch.ts) — explorerUri defaulted ──────────────
// The library functions require `explorerUri`; these thin wrappers inject the
// configured default while preserving the exact positional signatures.
export const fetchFileSourcesByHash = (fileHash, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchFileSourcesByHash(fileHash, explorerUri);

export const fetchInvalidFileSources = (sourceBoxId, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchInvalidFileSources(sourceBoxId, explorerUri);

export const fetchUnavailableSources = (sourceUrl, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchUnavailableSources(sourceUrl, explorerUri);

export const fetchProfileOpinions = (profileTokenId, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchProfileOpinions(profileTokenId, explorerUri);

export const fetchFileSourcesByProfile = (profileTokenId, limit = 50, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchFileSourcesByProfile(profileTokenId, limit, explorerUri);

export const fetchInvalidFileSourcesByProfile = (profileTokenId, limit = 50, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchInvalidFileSourcesByProfile(profileTokenId, limit, explorerUri);

export const fetchUnavailableSourcesByProfile = (profileTokenId, limit = 50, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchUnavailableSourcesByProfile(profileTokenId, limit, explorerUri);

export const fetchProfileOpinionsByAuthor = (authorTokenId, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.fetchProfileOpinionsByAuthor(authorTokenId, explorerUri);

export const searchByHash = (fileHash, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.searchByHash(fileHash, explorerUri);

export const loadProfileData = (profileTokenId, explorerUri = DEFAULT_EXPLORER_API) =>
  lib.loadProfileData(profileTokenId, explorerUri);
