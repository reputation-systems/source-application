/**
 * Bundle ENTRY for the Source Application MCP read surface.
 *
 * This file re-exports the library's OWN TypeScript logic straight from
 * `src/lib/ergo/*`. `mcp/build.mjs` runs esbuild over this entry to emit a single
 * Node-loadable ESM module (`mcp/_generated/lib.bundle.mjs`) with the browser-only
 * bits aliased away (`$app/environment`, `dompurify`) and `reputation-system`
 * redirected to its Node entry (`reputation-system/node`, kept external).
 *
 * The point: the read business logic lives ONCE, in `src/`. Nothing here is a
 * re-implementation — every symbol below is the real `src` function/constant.
 */

// Reads (Explorer box queries + R9 parsing) — src/lib/ergo/sourceFetch.ts
export {
  fetchFileSourcesByHash,
  fetchInvalidFileSources,
  fetchUnavailableSources,
  fetchProfileOpinions,
  fetchFileSourcesByProfile,
  fetchInvalidFileSourcesByProfile,
  fetchUnavailableSourcesByProfile,
  fetchProfileOpinionsByAuthor,
  searchByHash,
  loadProfileData
} from '../src/lib/ergo/sourceFetch.ts';

// Pure helpers + R9 (de)serialization + types — src/lib/ergo/sourceObject.ts
export {
  serializeSourceEntry,
  deserializeSourceEntry,
  getPrimaryUrl,
  getAllUrls,
  groupByDownloadSource,
  groupByProfile,
  calculateProfileTrust,
  aggregateSourceScore
} from '../src/lib/ergo/sourceObject.ts';

// Type NFT ids + supply — src/lib/ergo/envs.ts
export {
  PROFILE_TYPE_NFT_ID,
  PROFILE_TOTAL_SUPPLY,
  FILE_SOURCE_TYPE_NFT_ID,
  INVALID_FILE_SOURCE_TYPE_NFT_ID,
  UNAVAILABLE_SOURCE_TYPE_NFT_ID,
  PROFILE_OPINION_TYPE_NFT_ID
} from '../src/lib/ergo/envs.ts';

// Hash helpers — src/lib/ergo/hashUtils.ts
export {
  HASH_ALGORITHMS,
  HASH_OPTIONS,
  SEARCH_HASH_ALGORITHMS,
  computeHash,
  validateHash,
  normalizeHashAlgorithmId,
  getAlgorithmLabel
} from '../src/lib/ergo/hashUtils.ts';

// Byte/hex helper — src/lib/ergo/utils.ts
export { hexToUtf8 } from '../src/lib/ergo/utils.ts';
