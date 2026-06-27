/**
 * Hash utility functions for source verification.
 * Supports SHA3-256, SHA-256, Keccak-256, and Blake2b.
 * Uses @noble/hashes (already a transitive dependency via @fleet-sdk/crypto).
 */
/** Canonical algorithm IDs are defined as HASH(EMPTY_INPUT). */
export declare const HASH_ALGORITHM_IDS: {
    readonly sha3_256: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a";
    readonly blake2b256: "0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8";
    readonly sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    readonly keccak256: "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
};
/** Known hash algorithm IDs used in the application */
export declare const HASH_ALGORITHMS: {
    label: "SHA3-256" | "Blake2b-256" | "SHA-256" | "Keccak-256";
    value: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a" | "0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8" | "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" | "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
}[];
/** All algorithm values including custom */
export declare const HASH_OPTIONS: readonly [...{
    label: "SHA3-256" | "Blake2b-256" | "SHA-256" | "Keccak-256";
    value: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a" | "0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8" | "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" | "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
}[], {
    readonly label: "Custom";
    readonly value: "__custom__";
}];
/** Algorithm values for search (no custom — frontend can't compute unknown algorithms) */
export declare const SEARCH_HASH_ALGORITHMS: {
    label: "SHA3-256" | "Blake2b-256" | "SHA-256" | "Keccak-256";
    value: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a" | "0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8" | "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" | "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
}[];
/**
 * Normalize supported aliases to canonical on-chain identifiers HASH(EMPTY_INPUT).
 */
export declare function normalizeHashAlgorithmId(algorithmId: string): string;
/**
 * Compute a hash of the given data using the specified algorithm.
 * @returns hex string of the hash, or null if algorithm is unknown/custom
 */
export declare function computeHash(data: Uint8Array, algorithmId: string): string | null;
/**
 * Validate a hex hash string for a given algorithm.
 * Returns null if valid, or an error message if invalid.
 */
export declare function validateHash(hash: string, algorithmId: string): string | null;
/**
 * Get the human-readable label for an algorithm ID.
 */
export declare function getAlgorithmLabel(algorithmId: string): string;
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
export declare function downloadAndHash(url: string, algorithmId: string, isChunked?: boolean, onProgress?: (current: number, total: number) => void): Promise<string>;
