/**
 * Shared MCP tool registry for the Source Application.
 *
 * A single TOOLS array + HANDLERS map, consumed by BOTH transports:
 *   - mcp/server.mjs            (stdio, local agents/IDEs)
 *   - .service/server-http.mjs  (Streamable HTTP, the Celaut microVM)
 *
 * so the two never drift. Reads + pure helpers come from core.mjs; writes from
 * writes.mjs (env-configured signer, see lib.mjs). Write tools are no-ops on
 * keys in unsigned mode — they return an unsigned tx for an external wallet.
 */
import * as core from './core.mjs';
import * as writes from './writes.mjs';
import { signerMode, EXPLORER_API } from './lib.mjs';

const sourceEntrySchema = {
  type: 'object',
  description: 'A single source entry (the R9 payload of a FILE_SOURCE box).',
  properties: {
    hashFunctionId: { type: 'string', description: 'Hash function identifier, HASH(EMPTY_INPUT).' },
    contentFormat: { type: 'string', description: 'Content file format (e.g. ".tar.gz") or a format box id.' },
    contentHash: { type: 'string', description: 'Hash of the content at the URL.' },
    rawFormat: { type: 'string', description: 'Raw (uncompressed) file format or a format box id.' },
    urlLink: { type: 'string', description: 'The download URL.' },
    isChunked: { type: 'boolean', description: 'If true, urlLink points to a manifest of chunk URLs.' }
  },
  required: ['urlLink'],
  additionalProperties: false
};

export const TOOLS = [
  // ── Info ──────────────────────────────────────────────────────────────────
  {
    name: 'get_source_config',
    description: 'Return the Source Application Type NFT ids, the configured Explorer, and the active signer mode (seed|unsigned).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },

  // ── Reads ─────────────────────────────────────────────────────────────────
  {
    name: 'fetch_file_sources_by_hash',
    description: 'All FILE_SOURCE boxes (download sources) for a specific raw file hash.',
    inputSchema: { type: 'object', properties: { fileHash: { type: 'string' } }, required: ['fileHash'], additionalProperties: false }
  },
  {
    name: 'fetch_invalid_file_sources',
    description: 'All INVALID_FILE_SOURCE opinions targeting a specific FILE_SOURCE box id.',
    inputSchema: { type: 'object', properties: { sourceBoxId: { type: 'string' } }, required: ['sourceBoxId'], additionalProperties: false }
  },
  {
    name: 'fetch_unavailable_sources',
    description: 'All UNAVAILABLE_SOURCE opinions for a specific source URL.',
    inputSchema: { type: 'object', properties: { sourceUrl: { type: 'string' } }, required: ['sourceUrl'], additionalProperties: false }
  },
  {
    name: 'fetch_profile_opinions',
    description: 'All PROFILE_OPINION (trust/distrust) boxes targeting a specific profile token id.',
    inputSchema: { type: 'object', properties: { profileTokenId: { type: 'string' } }, required: ['profileTokenId'], additionalProperties: false }
  },
  {
    name: 'fetch_file_sources_by_profile',
    description: 'FILE_SOURCE boxes created by a specific profile token id.',
    inputSchema: { type: 'object', properties: { profileTokenId: { type: 'string' }, limit: { type: 'number' } }, required: ['profileTokenId'], additionalProperties: false }
  },
  {
    name: 'fetch_invalid_file_sources_by_profile',
    description: 'INVALID_FILE_SOURCE opinions created by a specific profile token id.',
    inputSchema: { type: 'object', properties: { profileTokenId: { type: 'string' }, limit: { type: 'number' } }, required: ['profileTokenId'], additionalProperties: false }
  },
  {
    name: 'fetch_unavailable_sources_by_profile',
    description: 'UNAVAILABLE_SOURCE opinions created by a specific profile token id.',
    inputSchema: { type: 'object', properties: { profileTokenId: { type: 'string' }, limit: { type: 'number' } }, required: ['profileTokenId'], additionalProperties: false }
  },
  {
    name: 'fetch_profile_opinions_by_author',
    description: 'PROFILE_OPINION boxes created BY a specific author token id (opinions given).',
    inputSchema: { type: 'object', properties: { authorTokenId: { type: 'string' } }, required: ['authorTokenId'], additionalProperties: false }
  },
  {
    name: 'search_by_hash',
    description: 'Full search by file hash: sources plus their invalidations and per-URL unavailabilities.',
    inputSchema: { type: 'object', properties: { fileHash: { type: 'string' } }, required: ['fileHash'], additionalProperties: false }
  },
  {
    name: 'load_profile_data',
    description: 'All data for a profile: its sources, invalidations, unavailabilities, opinions received and opinions given.',
    inputSchema: { type: 'object', properties: { profileTokenId: { type: 'string' } }, required: ['profileTokenId'], additionalProperties: false }
  },

  // ── Pure helpers ────────────────────────────────────────────────────────--
  {
    name: 'group_by_download_source',
    description: 'Group FILE_SOURCE entries by their download URL (pure; operates on provided arrays/maps, no chain access).',
    inputSchema: {
      type: 'object',
      properties: {
        sources: { type: 'array', items: { type: 'object' } },
        invalidationsMap: { type: 'object' },
        unavailabilitiesMap: { type: 'object' }
      },
      required: ['sources'],
      additionalProperties: false
    }
  },
  {
    name: 'group_by_profile',
    description: 'Group FILE_SOURCE entries by the profile that submitted them (pure).',
    inputSchema: { type: 'object', properties: { sources: { type: 'array', items: { type: 'object' } } }, required: ['sources'], additionalProperties: false }
  },
  {
    name: 'calculate_profile_trust',
    description: 'Net trust score (trust − distrust reputation) for a profile, from provided PROFILE_OPINION boxes (pure).',
    inputSchema: {
      type: 'object',
      properties: { profileTokenId: { type: 'string' }, opinions: { type: 'array', items: { type: 'object' } } },
      required: ['profileTokenId', 'opinions'],
      additionalProperties: false
    }
  },
  {
    name: 'aggregate_source_score',
    description: 'Aggregate confirmations/invalidations/unavailabilities + owner trust into a scored FileSourceWithScore (pure).',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'object' },
        allSources: { type: 'array', items: { type: 'object' } },
        invalidations: { type: 'array', items: { type: 'object' } },
        unavailabilities: { type: 'array', items: { type: 'object' } },
        profileOpinions: { type: 'array', items: { type: 'object' } }
      },
      required: ['source', 'allSources', 'invalidations', 'unavailabilities'],
      additionalProperties: false
    }
  },
  {
    name: 'get_primary_url',
    description: 'Primary download URL of a FileSource (pure).',
    inputSchema: { type: 'object', properties: { source: { type: 'object' } }, required: ['source'], additionalProperties: false }
  },
  {
    name: 'get_all_urls',
    description: 'All download URLs of a FileSource (pure).',
    inputSchema: { type: 'object', properties: { source: { type: 'object' } }, required: ['source'], additionalProperties: false }
  },
  {
    name: 'list_hash_algorithms',
    description: 'Supported hash algorithm ids/labels (HASH_OPTIONS and the search subset).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'validate_hash',
    description: 'Validate a hex hash for an algorithm id. Returns { valid, error } (pure).',
    inputSchema: { type: 'object', properties: { hash: { type: 'string' }, algorithmId: { type: 'string' } }, required: ['hash', 'algorithmId'], additionalProperties: false }
  },
  {
    name: 'compute_hash',
    description: 'Compute the hex hash of UTF-8 text or base64 bytes with a known algorithm id (sha256|sha3_256|keccak256|blake2b).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'UTF-8 text to hash (use this OR base64).' },
        base64: { type: 'string', description: 'Base64-encoded bytes to hash (use this OR text).' },
        algorithmId: { type: 'string' }
      },
      required: ['algorithmId'],
      additionalProperties: false
    }
  },

  // ── Writes (signer per SOURCE_SIGNER_MODE) ──────────────────────────────────
  {
    name: 'create_profile_box',
    description: 'Mint a reputation PROFILE box (author identity holding rep tokens). Signing per SOURCE_SIGNER_MODE (seed submits; unsigned returns the tx).',
    inputSchema: { type: 'object', properties: { content: { description: 'Optional profile content (string or JSON object).' } }, additionalProperties: false }
  },
  {
    name: 'add_file_source',
    description: 'Publish a FILE_SOURCE opinion (R5=fileHash, R9=source entry) spending from the author PROFILE box mainBoxId. Signing per SOURCE_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: { mainBoxId: { type: 'string' }, fileHash: { type: 'string' }, sourceEntry: sourceEntrySchema },
      required: ['mainBoxId', 'fileHash', 'sourceEntry'],
      additionalProperties: false
    }
  },
  {
    name: 'confirm_source',
    description: 'Confirm a source — same on-chain shape as add_file_source (a confirming FILE_SOURCE opinion). Signing per SOURCE_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: { mainBoxId: { type: 'string' }, fileHash: { type: 'string' }, sourceEntry: sourceEntrySchema },
      required: ['mainBoxId', 'fileHash', 'sourceEntry'],
      additionalProperties: false
    }
  },
  {
    name: 'update_file_source',
    description: 'Update a file source. NOTE: the Node signer surface has no update_opinion; this publishes a NEW FILE_SOURCE opinion with the new content for the same hash. Signing per SOURCE_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: { mainBoxId: { type: 'string' }, fileHash: { type: 'string' }, sourceEntry: sourceEntrySchema },
      required: ['mainBoxId', 'fileHash', 'sourceEntry'],
      additionalProperties: false
    }
  },
  {
    name: 'mark_invalid_source',
    description: 'Mark a FILE_SOURCE box invalid (negative opinion against INVALID_FILE_SOURCE_TYPE_NFT_ID, R5=sourceBoxId). Signing per SOURCE_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: { mainBoxId: { type: 'string' }, sourceBoxId: { type: 'string' } },
      required: ['mainBoxId', 'sourceBoxId'],
      additionalProperties: false
    }
  },
  {
    name: 'mark_unavailable_source',
    description: 'Mark a URL unavailable (negative opinion against UNAVAILABLE_SOURCE_TYPE_NFT_ID, R5=sourceUrl). Signing per SOURCE_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: { mainBoxId: { type: 'string' }, sourceUrl: { type: 'string' } },
      required: ['mainBoxId', 'sourceUrl'],
      additionalProperties: false
    }
  },
  {
    name: 'trust_profile',
    description: 'Trust or distrust a profile (PROFILE_OPINION, R5=profileTokenId, R8=isTrusted). Signing per SOURCE_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: { mainBoxId: { type: 'string' }, profileTokenId: { type: 'string' }, isTrusted: { type: 'boolean' } },
      required: ['mainBoxId', 'profileTokenId', 'isTrusted'],
      additionalProperties: false
    }
  }
];

export const HANDLERS = {
  // info
  get_source_config: async () => ({
    explorerUri: EXPLORER_API,
    signerMode: signerMode(),
    typeNfts: {
      PROFILE_TYPE_NFT_ID: core.PROFILE_TYPE_NFT_ID,
      FILE_SOURCE_TYPE_NFT_ID: core.FILE_SOURCE_TYPE_NFT_ID,
      INVALID_FILE_SOURCE_TYPE_NFT_ID: core.INVALID_FILE_SOURCE_TYPE_NFT_ID,
      UNAVAILABLE_SOURCE_TYPE_NFT_ID: core.UNAVAILABLE_SOURCE_TYPE_NFT_ID,
      PROFILE_OPINION_TYPE_NFT_ID: core.PROFILE_OPINION_TYPE_NFT_ID
    },
    profileTotalSupply: core.PROFILE_TOTAL_SUPPLY
  }),

  // reads
  fetch_file_sources_by_hash: async ({ fileHash }) => core.fetchFileSourcesByHash(fileHash),
  fetch_invalid_file_sources: async ({ sourceBoxId }) => core.fetchInvalidFileSources(sourceBoxId),
  fetch_unavailable_sources: async ({ sourceUrl }) => core.fetchUnavailableSources(sourceUrl),
  fetch_profile_opinions: async ({ profileTokenId }) => core.fetchProfileOpinions(profileTokenId),
  fetch_file_sources_by_profile: async ({ profileTokenId, limit = 50 }) => core.fetchFileSourcesByProfile(profileTokenId, limit),
  fetch_invalid_file_sources_by_profile: async ({ profileTokenId, limit = 50 }) => core.fetchInvalidFileSourcesByProfile(profileTokenId, limit),
  fetch_unavailable_sources_by_profile: async ({ profileTokenId, limit = 50 }) => core.fetchUnavailableSourcesByProfile(profileTokenId, limit),
  fetch_profile_opinions_by_author: async ({ authorTokenId }) => core.fetchProfileOpinionsByAuthor(authorTokenId),
  search_by_hash: async ({ fileHash }) => core.searchByHash(fileHash),
  load_profile_data: async ({ profileTokenId }) => core.loadProfileData(profileTokenId),

  // pure helpers
  group_by_download_source: async ({ sources, invalidationsMap = {}, unavailabilitiesMap = {} }) =>
    core.groupByDownloadSource(sources, invalidationsMap, unavailabilitiesMap),
  group_by_profile: async ({ sources }) => core.groupByProfile(sources),
  calculate_profile_trust: async ({ profileTokenId, opinions }) => ({
    profileTokenId,
    trustScore: core.calculateProfileTrust(profileTokenId, opinions)
  }),
  aggregate_source_score: async ({ source, allSources, invalidations, unavailabilities, profileOpinions = [] }) =>
    core.aggregateSourceScore(source, allSources, invalidations, unavailabilities, profileOpinions),
  get_primary_url: async ({ source }) => ({ url: core.getPrimaryUrl(source) }),
  get_all_urls: async ({ source }) => ({ urls: core.getAllUrls(source) }),
  list_hash_algorithms: async () => ({ options: core.HASH_OPTIONS, search: core.SEARCH_HASH_ALGORITHMS }),
  validate_hash: async ({ hash, algorithmId }) => {
    const error = core.validateHash(hash, algorithmId);
    return { valid: error === null, error };
  },
  compute_hash: async ({ text, base64, algorithmId }) => {
    let data;
    if (typeof base64 === 'string') data = new Uint8Array(Buffer.from(base64, 'base64'));
    else if (typeof text === 'string') data = new TextEncoder().encode(text);
    else throw new Error('compute_hash requires either `text` or `base64`.');
    const hash = await core.computeHash(data, algorithmId);
    if (hash === null) throw new Error(`Unsupported hash algorithm: ${algorithmId}`);
    return { algorithmId, hash };
  },

  // writes
  create_profile_box: async ({ content } = {}) => writes.createProfileBox(content ?? { name: 'Anon' }),
  add_file_source: async ({ mainBoxId, fileHash, sourceEntry }) => writes.addFileSource(mainBoxId, fileHash, sourceEntry),
  confirm_source: async ({ mainBoxId, fileHash, sourceEntry }) => writes.confirmSource(mainBoxId, fileHash, sourceEntry),
  update_file_source: async ({ mainBoxId, fileHash, sourceEntry }) => writes.updateFileSource(mainBoxId, fileHash, sourceEntry),
  mark_invalid_source: async ({ mainBoxId, sourceBoxId }) => writes.markInvalidSource(mainBoxId, sourceBoxId),
  mark_unavailable_source: async ({ mainBoxId, sourceUrl }) => writes.markUnavailableSource(mainBoxId, sourceUrl),
  trust_profile: async ({ mainBoxId, profileTokenId, isTrusted }) => writes.trustProfile(mainBoxId, profileTokenId, isTrusted)
};
