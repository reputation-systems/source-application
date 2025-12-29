/**
 * Data models for Source Application
 *
 * This module defines the core interfaces for the decentralized File Discovery
 * and Verification system built on Ergo blockchain.
 */
export interface FileSource {
    id: string;
    fileHash: string;
    sourceUrl: string;
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
 * Group file sources by their download URL.
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
