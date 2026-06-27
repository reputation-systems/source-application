// @ts-nocheck — plain-ESM runtime module shared by the stdio MCP server, the
// HTTP/REST `.service`, and any bare-Node script. It mirrors the read surface of
// `src/lib/ergo/sourceFetch.ts` + the pure helpers of `src/lib/ergo/sourceObject.ts`,
// but is NOT TypeScript-checked and carries NO Svelte/Vite dependency.
/**
 * Source Application registry — framework-agnostic data core.
 *
 * This is the SINGLE source of truth for the on-chain Source Application read
 * layer outside the browser: the Type NFT ids, the box queries, the R9
 * (source-entry) parsers, the `fetch*` reads, and the pure aggregation helpers.
 *
 * The Explorer box search + block-timestamp lookup are imported from
 * `reputation-system/node` — the headless, Node-safe entry of the reputation
 * library (no `.svelte` imports in its graph). This is the SAME `searchBoxes`
 * the Svelte app uses via `reputation-system`, so the reads never drift from the
 * app, and they include the required reputation-proof `ergoTreeTemplateHash`
 * filter that the Explorer's `/boxes/unspent/search` endpoint demands.
 *
 * Type NFT ids are copied verbatim from `src/lib/ergo/envs.ts`. Several are
 * PLACEHOLDER values (all-zero hex); they are preserved as-is. Queries against a
 * non-real Type NFT simply match no boxes and return a clean empty array, so the
 * read tools degrade gracefully rather than throwing.
 */
import { searchBoxes, getTimestampFromBlockId } from 'reputation-system/node';

// ── Type NFT ids (verbatim from src/lib/ergo/envs.ts) ───────────────────────
export const PROFILE_TYPE_NFT_ID = '1820fd428a0b92d61ce3f86cd98240fdeeee8a392900f0b19a2e017d66f79926';
export const PROFILE_TOTAL_SUPPLY = 99999999;
export const FILE_SOURCE_TYPE_NFT_ID = '8299d98e15ebee7fa39ad716de7c8bb191790a1bf4b7c3f91af35a0e36187706';
export const INVALID_FILE_SOURCE_TYPE_NFT_ID = '0000000000000000000000000000000000000000000000000000000000000002';
export const UNAVAILABLE_SOURCE_TYPE_NFT_ID = '0000000000000000000000000000000000000000000000000000000000000003';
export const PROFILE_OPINION_TYPE_NFT_ID = '0000000000000000000000000000000000000000000000000000000000000004';

export const DEFAULT_EXPLORER_API =
  (typeof process !== 'undefined' && process.env && process.env.SOURCE_EXPLORER_API) ||
  'https://api.ergoplatform.com';

export const isHexId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{4,}$/.test(v);

/** Decode a hex string (Explorer Coll[Byte] renderedValue) to UTF-8 text. */
export function hexToUtf8(hexString) {
  if (!hexString || typeof hexString !== 'string' || hexString.length % 2 !== 0) return null;
  try {
    const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return null;
  }
}

// ── Source-entry (R9) serialization — verbatim from sourceObject.ts ─────────

/**
 * Serialize a SourceEntry to the R9 JSON string (Coll[Coll[Byte]] shape):
 *   [[hashFunctionId, contentFormat, contentHash, rawFormat, urlLink, isChunked]]
 */
export function serializeSourceEntry(entry) {
  const tuple = [
    entry.hashFunctionId || '',
    entry.contentFormat || '',
    entry.contentHash || '',
    entry.rawFormat || '',
    entry.urlLink || '',
    entry.isChunked ?? false
  ];
  return JSON.stringify([tuple]);
}

/** Deserialize an R9 content string into a SourceEntry (tuple/object/legacy-url). */
export function deserializeSourceEntry(content) {
  const empty = { hashFunctionId: '', contentFormat: '', contentHash: '', rawFormat: '', urlLink: '' };
  if (!content || content.trim() === '') return empty;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const tuple = parsed[0];
      if (Array.isArray(tuple) && tuple.length >= 5) {
        return {
          hashFunctionId: tuple[0] || '',
          contentFormat: tuple[1] || '',
          contentHash: tuple[2] || '',
          rawFormat: tuple[3] || '',
          urlLink: tuple[4] || '',
          isChunked: tuple[5] === true
        };
      }
      if (typeof tuple === 'object' && tuple !== null && !Array.isArray(tuple)) {
        return {
          hashFunctionId: tuple.hashFunctionId || '',
          contentFormat: tuple.contentFormat || tuple.contentFormatNftId || '',
          contentHash: tuple.contentHash || '',
          rawFormat: tuple.rawFormat || tuple.rawFormatNftId || '',
          urlLink: tuple.urlLink || '',
          isChunked: tuple.isChunked === true
        };
      }
    }
  } catch {
    // not JSON — legacy plain URL string
  }
  return { hashFunctionId: '', contentFormat: '', contentHash: '', rawFormat: '', urlLink: content, isChunked: false };
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function collectBoxes(generator) {
  const boxes = [];
  for await (const batch of generator) boxes.push(...batch);
  return boxes;
}

/** Block timestamp for a box; non-critical, so failures degrade to 0. */
async function boxTimestamp(explorerUri, box) {
  if (!box || !box.blockId) return 0;
  try {
    return await getTimestampFromBlockId(explorerUri, box.blockId);
  } catch {
    return 0;
  }
}

function parseR9SourceEntry(box) {
  const rendered = box?.additionalRegisters?.R9?.renderedValue;
  const raw = rendered ? hexToUtf8(rendered) : '';
  return deserializeSourceEntry(raw || '');
}

// ── Reads (port of src/lib/ergo/sourceFetch.ts, Svelte-free) ────────────────
// Positional searchBoxes args (from reputation-system/node):
//   (explorerUri, tokenId, typeNftId, objectPointer, isLocked, polarization,
//    content, ownerAddress, limit, offset)

/** All FILE_SOURCE boxes for a specific file hash. */
export async function fetchFileSourcesByHash(fileHash, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(FILE_SOURCE_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, undefined, FILE_SOURCE_TYPE_NFT_ID, fileHash, undefined, undefined, undefined, undefined, undefined, undefined)
  );
  const sources = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    if (box.additionalRegisters.R6?.renderedValue !== 'false') continue;
    if (!box.additionalRegisters.R9?.renderedValue) continue;
    const sourceEntry = parseR9SourceEntry(box);
    sources.push({
      id: box.boxId,
      fileHash,
      hashFunctionId: sourceEntry.hashFunctionId || '',
      source: sourceEntry,
      ownerTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      isLocked: false,
      transactionId: box.transactionId
    });
  }
  sources.sort((a, b) => b.timestamp - a.timestamp);
  return sources;
}

/** All INVALID_FILE_SOURCE boxes targeting a specific source box id. */
export async function fetchInvalidFileSources(sourceBoxId, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(INVALID_FILE_SOURCE_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, undefined, INVALID_FILE_SOURCE_TYPE_NFT_ID, sourceBoxId, undefined, undefined, undefined, undefined, undefined, undefined)
  );
  const out = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    out.push({
      id: box.boxId,
      targetBoxId: sourceBoxId,
      authorTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      transactionId: box.transactionId
    });
  }
  return out;
}

/** All UNAVAILABLE_SOURCE boxes for a specific URL. */
export async function fetchUnavailableSources(sourceUrl, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(UNAVAILABLE_SOURCE_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, undefined, UNAVAILABLE_SOURCE_TYPE_NFT_ID, sourceUrl, undefined, undefined, undefined, undefined, undefined, undefined)
  );
  const out = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    out.push({
      id: box.boxId,
      sourceUrl,
      authorTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      transactionId: box.transactionId
    });
  }
  return out;
}

/** All PROFILE_OPINION boxes targeting a specific profile token id. */
export async function fetchProfileOpinions(profileTokenId, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(PROFILE_OPINION_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, undefined, PROFILE_OPINION_TYPE_NFT_ID, profileTokenId, undefined, undefined, undefined, undefined, undefined, undefined)
  );
  const out = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    if (box.additionalRegisters.R6?.renderedValue === 'false') continue;
    out.push({
      id: box.boxId,
      targetProfileTokenId: profileTokenId,
      isTrusted: box.additionalRegisters.R8?.renderedValue === 'true',
      authorTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      transactionId: box.transactionId
    });
  }
  return out;
}

/** FILE_SOURCE boxes created by a specific profile token id. */
export async function fetchFileSourcesByProfile(profileTokenId, limit = 50, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(FILE_SOURCE_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, profileTokenId, FILE_SOURCE_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, limit, undefined)
  );
  const sources = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    if (box.additionalRegisters.R6?.renderedValue !== 'false') continue;
    if (!box.additionalRegisters.R9?.renderedValue) continue;
    const fileHash = box.additionalRegisters.R5?.renderedValue || '[Unknown]';
    const sourceEntry = parseR9SourceEntry(box);
    sources.push({
      id: box.boxId,
      fileHash,
      hashFunctionId: sourceEntry.hashFunctionId || '',
      source: sourceEntry,
      ownerTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      isLocked: false,
      transactionId: box.transactionId
    });
  }
  sources.sort((a, b) => b.timestamp - a.timestamp);
  return sources;
}

/** INVALID_FILE_SOURCE boxes created by a specific profile. */
export async function fetchInvalidFileSourcesByProfile(profileTokenId, limit = 50, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(INVALID_FILE_SOURCE_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, profileTokenId, INVALID_FILE_SOURCE_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, limit, undefined)
  );
  const out = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    out.push({
      id: box.boxId,
      targetBoxId: hexToUtf8(box.additionalRegisters.R5?.renderedValue || '') || '',
      authorTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      transactionId: box.transactionId
    });
  }
  return out;
}

/** UNAVAILABLE_SOURCE boxes created by a specific profile. */
export async function fetchUnavailableSourcesByProfile(profileTokenId, limit = 50, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(UNAVAILABLE_SOURCE_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, profileTokenId, UNAVAILABLE_SOURCE_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, limit, undefined)
  );
  const out = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    out.push({
      id: box.boxId,
      sourceUrl: hexToUtf8(box.additionalRegisters.R5?.renderedValue || '') || '',
      authorTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      transactionId: box.transactionId
    });
  }
  return out;
}

/** PROFILE_OPINION boxes created by a specific author token id. */
export async function fetchProfileOpinionsByAuthor(authorTokenId, explorerUri = DEFAULT_EXPLORER_API) {
  if (!isHexId(PROFILE_OPINION_TYPE_NFT_ID)) return [];
  const boxes = await collectBoxes(
    searchBoxes(explorerUri, authorTokenId, PROFILE_OPINION_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, undefined, undefined)
  );
  const out = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    out.push({
      id: box.boxId,
      targetProfileTokenId: hexToUtf8(box.additionalRegisters.R5?.renderedValue || '') || '',
      isTrusted: box.additionalRegisters.R8?.renderedValue === 'true',
      authorTokenId: box.assets[0].tokenId,
      reputationAmount: Number(box.assets[0].amount),
      timestamp: await boxTimestamp(explorerUri, box),
      transactionId: box.transactionId
    });
  }
  return out;
}

/** Full search by file hash: sources + their invalidations + URL unavailabilities. */
export async function searchByHash(fileHash, explorerUri = DEFAULT_EXPLORER_API) {
  const sources = await fetchFileSourcesByHash(fileHash, explorerUri);
  const invalidations = {};
  const unavailabilities = {};
  for (const source of sources) {
    const invs = await fetchInvalidFileSources(source.id, explorerUri);
    if (invs.length > 0) invalidations[source.id] = invs;
    const url = source.source?.urlLink;
    if (url && !unavailabilities[url]) {
      const unavs = await fetchUnavailableSources(url, explorerUri);
      if (unavs.length > 0) unavailabilities[url] = unavs;
    }
  }
  return { sources, invalidations, unavailabilities };
}

/** All data related to a profile: its sources, invalidations, unavailabilities, opinions received + given. */
export async function loadProfileData(profileTokenId, explorerUri = DEFAULT_EXPLORER_API) {
  const sources = await fetchFileSourcesByProfile(profileTokenId, 50, explorerUri);
  const invalidations = await fetchInvalidFileSourcesByProfile(profileTokenId, 50, explorerUri);
  const unavailabilities = await fetchUnavailableSourcesByProfile(profileTokenId, 50, explorerUri);
  const opinions = await fetchProfileOpinions(profileTokenId, explorerUri);
  const opinionsGiven = await fetchProfileOpinionsByAuthor(profileTokenId, explorerUri);
  return { sources, invalidations, unavailabilities, opinions, opinionsGiven };
}

// ── Pure helpers (verbatim from sourceObject.ts) ────────────────────────────

export function getPrimaryUrl(source) {
  return source?.source?.urlLink || '';
}

export function getAllUrls(source) {
  return source?.source?.urlLink ? [source.source.urlLink] : [];
}

export function groupByDownloadSource(sources, invalidationsMap = {}, unavailabilitiesMap = {}) {
  const groups = {};
  for (const source of sources) {
    const url = source.source?.urlLink;
    if (!url) continue;
    if (!groups[url]) {
      groups[url] = {
        sourceUrl: url,
        sources: [],
        owners: [],
        invalidations: [],
        unavailabilities: unavailabilitiesMap[url]?.data || []
      };
    }
    if (!groups[url].sources.some((s) => s.id === source.id)) groups[url].sources.push(source);
    if (!groups[url].owners.includes(source.ownerTokenId)) groups[url].owners.push(source.ownerTokenId);
    const boxInvalidations = invalidationsMap[source.id]?.data || [];
    groups[url].invalidations.push(...boxInvalidations);
  }
  return Object.values(groups).sort((a, b) => b.sources.length - a.sources.length);
}

export function groupByProfile(sources) {
  const groups = {};
  for (const source of sources) {
    if (!groups[source.ownerTokenId]) {
      groups[source.ownerTokenId] = { profileTokenId: source.ownerTokenId, sources: [] };
    }
    groups[source.ownerTokenId].sources.push(source);
  }
  return Object.values(groups).sort((a, b) => b.sources.length - a.sources.length);
}

export function calculateProfileTrust(profileTokenId, opinions) {
  const trust = opinions.filter((o) => o.isTrusted).reduce((s, o) => s + o.reputationAmount, 0);
  const distrust = opinions.filter((o) => !o.isTrusted).reduce((s, o) => s + o.reputationAmount, 0);
  return trust - distrust;
}

export function aggregateSourceScore(source, allSources, invalidations, unavailabilities, profileOpinions = []) {
  const sourceUrl = source.source?.urlLink || '';
  const confirmations = allSources.filter(
    (s) => s.id !== source.id && s.fileHash === source.fileHash && s.source?.urlLink === sourceUrl
  );
  const filteredInvalidations = invalidations.filter((inv) => inv.targetBoxId === source.id);
  const filteredUnavailabilities = unavailabilities.filter((un) => un.sourceUrl === sourceUrl);
  const confirmationScore = confirmations.reduce((s, x) => s + x.reputationAmount, 0);
  const invalidationScore = filteredInvalidations.reduce((s, x) => s + x.reputationAmount, 0);
  const unavailabilityScore = filteredUnavailabilities.reduce((s, x) => s + x.reputationAmount, 0);
  const ownerTrustScore = calculateProfileTrust(source.ownerTokenId, profileOpinions);
  return {
    ...source,
    confirmations,
    invalidations: filteredInvalidations,
    unavailabilities: filteredUnavailabilities,
    confirmationScore,
    invalidationScore,
    unavailabilityScore,
    ownerTrustScore
  };
}

// ── Hash helpers (from src/lib/ergo/hashUtils.ts) ───────────────────────────

export const HASH_ALGORITHMS = [
  { label: 'SHA3-256', value: 'sha3_256' },
  { label: 'Blake2b', value: 'blake2b' },
  { label: 'SHA-256', value: 'sha256' },
  { label: 'Keccak-256', value: 'keccak256' }
];
export const HASH_OPTIONS = [...HASH_ALGORITHMS, { label: 'Custom', value: '__custom__' }];
export const SEARCH_HASH_ALGORITHMS = HASH_ALGORITHMS;

function uint8ArrayToHex(array) {
  return [...array].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Compute the hex hash of bytes with a known algorithm id, or null if unknown/custom. */
export async function computeHash(data, algorithmId) {
  const { sha256 } = await import('@noble/hashes/sha256');
  const { sha3_256, keccak_256 } = await import('@noble/hashes/sha3');
  const { blake2b } = await import('@noble/hashes/blake2b');
  switch (algorithmId) {
    case 'sha256':
      return uint8ArrayToHex(sha256(data));
    case 'sha3_256':
      return uint8ArrayToHex(sha3_256(data));
    case 'keccak256':
      return uint8ArrayToHex(keccak_256(data));
    case 'blake2b':
      return uint8ArrayToHex(blake2b(data, { dkLen: 32 }));
    default:
      return null;
  }
}

/** Validate a hex hash for an algorithm. Returns null if valid, else an error string. */
export function validateHash(hash, algorithmId) {
  if (!hash || hash.trim() === '') return 'Hash cannot be empty';
  const trimmed = hash.trim();
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return 'Hash must contain only hexadecimal characters (0-9, a-f)';
  switch (algorithmId) {
    case 'sha3_256':
    case 'sha256':
    case 'keccak256':
      if (trimmed.length !== 64) return `${algorithmId} hash must be exactly 64 hex characters (256-bit). Got ${trimmed.length}.`;
      break;
    case 'blake2b':
      if (trimmed.length !== 64 && trimmed.length !== 128) return `Blake2b hash must be 64 or 128 hex characters. Got ${trimmed.length}.`;
      break;
    default:
      break;
  }
  return null;
}
