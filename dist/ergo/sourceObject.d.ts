/**
 * Data models for Source Application
 *
 * This module defines the core interfaces for the decentralized File Discovery
 * and Verification system built on Ergo blockchain.
 */
export interface SourceEntry {
    hashFunctionId: string;
    contentFormat: string;
    contentHash: string;
    rawFormat: string;
    urlLink: string;
    isChunked?: boolean;
}
export interface FileSource {
    id: string;
    fileHash: string;
    hashFunctionId: string;
    source: SourceEntry;
    ownerTokenId: string;
    reputationAmount: number;
    timestamp: number;
    isLocked: boolean;
    transactionId: string;
}
export interface InvalidFileSource {
    id: string;
    targetBoxId: string;
    authorTokenId: string;
    reputationAmount: number;
    timestamp: number;
    transactionId: string;
}
export interface UnavailableSource {
    id: string;
    sourceUrl: string;
    authorTokenId: string;
    reputationAmount: number;
    timestamp: number;
    transactionId: string;
}
export interface ProfileOpinion {
    id: string;
    targetProfileTokenId: string;
    isTrusted: boolean;
    authorTokenId: string;
    reputationAmount: number;
    timestamp: number;
    transactionId: string;
}
export interface TimelineEvent {
    timestamp: number;
    type: 'FILE_SOURCE' | 'INVALID_FILE_SOURCE' | 'UNAVAILABLE_SOURCE' | 'PROFILE_OPINION';
    label: string;
    color: string;
    authorTokenId?: string;
    data: any;
}
export interface SearchResult {
    sources: FileSource[];
    invalidations: {
        [sourceId: string]: InvalidFileSource[];
    };
    unavailabilities: {
        [sourceUrl: string]: UnavailableSource[];
    };
}
export interface ProfileData {
    sources: FileSource[];
    invalidations: InvalidFileSource[];
    unavailabilities: UnavailableSource[];
    opinions: ProfileOpinion[];
    opinionsGiven: ProfileOpinion[];
}
export interface CachedData<T> {
    [key: string]: {
        data: T;
        timestamp: number;
    };
}
/**
 * File source with aggregated opinion data
 */
export interface FileSourceWithScore extends FileSource {
    confirmations: FileSource[];
    invalidations: InvalidFileSource[];
    unavailabilities: UnavailableSource[];
    confirmationScore: number;
    invalidationScore: number;
    unavailabilityScore: number;
    ownerTrustScore: number;
}
/**
 * Data for a unique download source (URL)
 */
export interface DownloadSourceGroup {
    sourceUrl: string;
    sources: FileSource[];
    owners: string[];
    invalidations: InvalidFileSource[];
    unavailabilities: UnavailableSource[];
}
/**
 * Data for a specific profile's contributions to a hash
 */
export interface ProfileSourceGroup {
    profileTokenId: string;
    sources: FileSource[];
}
/**
 * Get the primary URL from a FileSource.
 * Returns the first source entry's URL, or an empty string if no sources.
 */
export declare function getPrimaryUrl(source: FileSource): string;
/**
 * Get all URLs from a FileSource.
 * With single source entry, returns an array with one URL.
 */
export declare function getAllUrls(source: FileSource): string[];
/**
 * Group file sources by their download URLs.
 * A FileSource can contain multiple URLs; it will appear in each group.
 */
export declare function groupByDownloadSource(sources: FileSource[], invalidationsMap: Record<string, {
    data: InvalidFileSource[];
}>, unavailabilitiesMap: Record<string, {
    data: UnavailableSource[];
}>): DownloadSourceGroup[];
/**
 * Group file sources by the profile that submitted them.
 */
export declare function groupByProfile(sources: FileSource[]): ProfileSourceGroup[];
/**
 * Calculate the trust score for a profile based on PROFILE_OPINION boxes.
 */
export declare function calculateProfileTrust(profileTokenId: string, opinions: ProfileOpinion[]): number;
/**
 * Aggregate opinions into score data for a file source.
 */
export declare function aggregateSourceScore(source: FileSource, allSources: FileSource[], invalidations: InvalidFileSource[], unavailabilities: UnavailableSource[], profileOpinions?: ProfileOpinion[]): FileSourceWithScore;
/**
 * Serialize source entries to a JSON string for R9 content.
 * The reputation-system library encodes this as Coll[Byte] (UTF-8 bytes).
 *
 * Format: Coll[Coll[Byte]] — a JSON array containing one tuple (array):
 * [hash_function_id, content_format, content_hash, raw_format, url_link, is_chunked]
 *
 * Serialization format: Coll[Coll[Byte]]
 * The output represents a Coll[Coll[Byte]] structure — an array containing
 * one tuple (inner Coll[Byte]) with the source entry fields:
 *   [[hashFunctionId, contentFormat, contentHash, rawFormat, urlLink, isChunked]]
 *
 * The reputation-system library encodes this JSON string as Coll[Byte] for R9.
 * Since encoding operates on the raw UTF-8 bytes of the JSON string (not on
 * individual tuple elements), mixed types (string + boolean) within the tuple
 * are fine — JSON.parse restores original types on deserialization.
 */
export declare function serializeSourceEntry(entry: SourceEntry): string;
/**
 * Deserialize source entries from R9 content string.
 *
 * Supports three formats (tried in order):
 * 1. Coll[Coll[Byte]] tuple format: [[hashFnId, contentFmt, contentHash, rawFmt, urlLink, isChunked]]
 * 2. Legacy JSON object format: [{ hashFunctionId, contentFormat, ... }]
 * 3. Legacy plain URL string
 *
 * Note: tuple[5] (isChunked) is a boolean while other elements are strings.
 * This is fine because the JSON string is what gets encoded as Coll[Byte],
 * and JSON.parse restores the original types.
 */
export declare function deserializeSourceEntry(content: string): SourceEntry;
