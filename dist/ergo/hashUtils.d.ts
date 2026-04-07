/**
 * Hash utility functions for source verification.
 * Supports SHA3-256, SHA-256, Keccak-256, and Blake2b.
 * Uses @noble/hashes (already a transitive dependency via @fleet-sdk/crypto).
 */
/** Known hash algorithm IDs used in the application */
export declare const HASH_ALGORITHMS: readonly [{
    readonly label: "SHA3-256";
    readonly value: "sha3_256";
}, {
    readonly label: "Blake2b";
    readonly value: "blake2b";
}, {
    readonly label: "SHA-256";
    readonly value: "sha256";
}, {
    readonly label: "Keccak-256";
    readonly value: "keccak256";
}];
/** All algorithm values including custom */
export declare const HASH_OPTIONS: readonly [{
    readonly label: "SHA3-256";
    readonly value: "sha3_256";
}, {
    readonly label: "Blake2b";
    readonly value: "blake2b";
}, {
    readonly label: "SHA-256";
    readonly value: "sha256";
}, {
    readonly label: "Keccak-256";
    readonly value: "keccak256";
}, {
    readonly label: "Custom";
    readonly value: "__custom__";
}];
/** Algorithm values for search (no custom — frontend can't compute unknown algorithms) */
export declare const SEARCH_HASH_ALGORITHMS: readonly [{
    readonly label: "SHA3-256";
    readonly value: "sha3_256";
}, {
    readonly label: "Blake2b";
    readonly value: "blake2b";
}, {
    readonly label: "SHA-256";
    readonly value: "sha256";
}, {
    readonly label: "Keccak-256";
    readonly value: "keccak256";
}];
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
