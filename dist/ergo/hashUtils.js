/**
 * Hash utility functions for source verification.
 * Supports SHA3-256, SHA-256, Keccak-256, and Blake2b.
 * Uses @noble/hashes (already a transitive dependency via @fleet-sdk/crypto).
 */
import { sha256 } from '@noble/hashes/sha256';
import { sha3_256, keccak_256 } from '@noble/hashes/sha3';
import { blake2b } from '@noble/hashes/blake2b';
/** Canonical algorithm IDs are defined as HASH(EMPTY_INPUT). */
export const HASH_ALGORITHM_IDS = {
    sha3_256: 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
    blake2b256: '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    keccak256: 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
};
const HASH_ALGORITHM_DEFINITIONS = [
    {
        key: 'sha3_256',
        label: 'SHA3-256',
        value: HASH_ALGORITHM_IDS.sha3_256,
        aliases: ['sha3_256'],
    },
    {
        key: 'blake2b256',
        label: 'Blake2b-256',
        value: HASH_ALGORITHM_IDS.blake2b256,
        aliases: ['blake2b', 'blake2b256'],
    },
    {
        key: 'sha256',
        label: 'SHA-256',
        value: HASH_ALGORITHM_IDS.sha256,
        aliases: ['sha256'],
    },
    {
        key: 'keccak256',
        label: 'Keccak-256',
        value: HASH_ALGORITHM_IDS.keccak256,
        aliases: ['keccak256'],
    },
];
/** Known hash algorithm IDs used in the application */
export const HASH_ALGORITHMS = HASH_ALGORITHM_DEFINITIONS.map(({ label, value }) => ({ label, value }));
/** All algorithm values including custom */
export const HASH_OPTIONS = [
    ...HASH_ALGORITHMS,
    { label: "Custom", value: "__custom__" },
];
/** Algorithm values for search (no custom — frontend can't compute unknown algorithms) */
export const SEARCH_HASH_ALGORITHMS = HASH_ALGORITHMS;
function uint8ArrayToHex(array) {
    return [...array].map(x => x.toString(16).padStart(2, '0')).join('');
}
function getHashAlgorithmDefinition(algorithmId) {
    const trimmed = algorithmId.trim();
    const normalized = trimmed.toLowerCase();
    return HASH_ALGORITHM_DEFINITIONS.find(({ value, aliases }) => value === trimmed ||
        value === normalized ||
        aliases.includes(normalized));
}
/**
 * Normalize supported aliases to canonical on-chain identifiers HASH(EMPTY_INPUT).
 */
export function normalizeHashAlgorithmId(algorithmId) {
    const trimmed = algorithmId.trim();
    return getHashAlgorithmDefinition(trimmed)?.value || trimmed;
}
/**
 * Compute a hash of the given data using the specified algorithm.
 * @returns hex string of the hash, or null if algorithm is unknown/custom
 */
export function computeHash(data, algorithmId) {
    const definition = getHashAlgorithmDefinition(algorithmId);
    switch (definition?.key) {
        case 'sha256':
            return uint8ArrayToHex(sha256(data));
        case 'sha3_256':
            return uint8ArrayToHex(sha3_256(data));
        case 'keccak256':
            return uint8ArrayToHex(keccak_256(data));
        case 'blake2b256':
            // Default to 256-bit (32 bytes) output
            return uint8ArrayToHex(blake2b(data, { dkLen: 32 }));
        default:
            return null;
    }
}
/**
 * Validate a hex hash string for a given algorithm.
 * Returns null if valid, or an error message if invalid.
 */
export function validateHash(hash, algorithmId) {
    if (!hash || hash.trim() === '') {
        return 'Hash cannot be empty';
    }
    const trimmed = hash.trim();
    // Check hex characters
    if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
        return 'Hash must contain only hexadecimal characters (0-9, a-f)';
    }
    switch (getHashAlgorithmDefinition(algorithmId)?.key) {
        case 'sha3_256':
        case 'sha256':
        case 'keccak256':
            if (trimmed.length !== 64) {
                return `${getAlgorithmLabel(algorithmId)} hash must be exactly 64 hex characters (256-bit). Got ${trimmed.length}.`;
            }
            break;
        case 'blake2b256':
            if (trimmed.length !== 64 && trimmed.length !== 128) {
                return `Blake2b-256 hash must be 64 hex characters (256-bit) or 128 hex characters (512-bit). Got ${trimmed.length}.`;
            }
            break;
        case '__custom__':
            // Custom algorithm — only validate hex and non-empty
            break;
        default:
            // Unknown algorithm id — only validate hex
            break;
    }
    return null;
}
/**
 * Get the human-readable label for an algorithm ID.
 */
export function getAlgorithmLabel(algorithmId) {
    const found = getHashAlgorithmDefinition(algorithmId);
    return found ? found.label : algorithmId;
}
/**
 * Download content from a URL and compute its hash.
 * Supports chunked files (manifest-based): if isChunked is true,
 * the URL is treated as a manifest where each line is a chunk URL.
 *
 * @param url - The URL to fetch (or manifest URL if chunked)
 * @param algorithmId - Hash algorithm to use
 * @param isChunked - Whether this is a chunked manifest
 * @param onProgress - Optional progress callback (current, total) for chunked downloads
 * @returns hex hash string
 * @throws if algorithm is custom/unknown, fetch fails, etc.
 */
export async function downloadAndHash(url, algorithmId, isChunked = false, onProgress) {
    const normalizedAlgorithmId = normalizeHashAlgorithmId(algorithmId);
    if (normalizedAlgorithmId === '__custom__' || !getHashAlgorithmDefinition(normalizedAlgorithmId)) {
        throw new Error('Cannot verify: custom hash algorithm');
    }
    let data;
    if (isChunked) {
        // Fetch manifest
        const manifestResponse = await fetch(url);
        if (!manifestResponse.ok) {
            throw new Error(`Failed to fetch manifest: ${manifestResponse.statusText}`);
        }
        const manifestText = await manifestResponse.text();
        const chunkUrls = manifestText.trim().split('\n').filter(line => line.trim() !== '');
        if (chunkUrls.length === 0) {
            throw new Error('Manifest is empty — no chunk URLs found');
        }
        // Download all chunks in order
        const chunks = [];
        let totalSize = 0;
        for (let i = 0; i < chunkUrls.length; i++) {
            if (onProgress)
                onProgress(i, chunkUrls.length);
            const chunkResponse = await fetch(chunkUrls[i].trim());
            if (!chunkResponse.ok) {
                throw new Error(`Failed to fetch chunk ${i + 1}/${chunkUrls.length}: ${chunkResponse.statusText}`);
            }
            const chunkBuffer = await chunkResponse.arrayBuffer();
            const chunkBytes = new Uint8Array(chunkBuffer);
            chunks.push(chunkBytes);
            totalSize += chunkBytes.length;
        }
        if (onProgress)
            onProgress(chunkUrls.length, chunkUrls.length);
        // Concatenate all chunks
        data = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
            data.set(chunk, offset);
            offset += chunk.length;
        }
    }
    else {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        data = new Uint8Array(buffer);
    }
    const result = computeHash(data, normalizedAlgorithmId);
    if (result === null) {
        throw new Error(`Cannot verify: unsupported hash algorithm "${algorithmId}"`);
    }
    return result;
}
