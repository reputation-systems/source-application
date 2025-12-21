/**
 * Data models for Source Application
 * 
 * This module defines the core interfaces for the decentralized File Discovery 
 * and Verification system built on Ergo blockchain.
 */


// --- FILE_SOURCE (Box Type 1) ---
// Represents a specific location (URL) where a file with a specific hash can be found.
export interface FileSource {
    id: string;              // Box ID of the source
    fileHash: string;        // R5: Blake2b256 digest (the anchor - users search by this)
    sourceUrl: string;       // R9: Download link (URL, IPFS CID, Magnet link, etc.)
    ownerTokenId: string;    // Reputation Token ID from assets[0]
    reputationAmount: number; // Amount of reputation tokens in this box
    timestamp: number;       // Block timestamp
    isLocked: boolean;       // R6: Always false (unlocked) for this app
    transactionId: string;   // Transaction ID
}

// --- INVALID_FILE_SOURCE (Box Type 4) ---
// Represents an opinion that a specific FILE_SOURCE box is fake or incorrect.
export interface InvalidFileSource {
    id: string;              // Box ID of this opinion
    targetBoxId: string;     // R5: The specific box ID being invalidated
    authorTokenId: string;   // Reputation Token ID from assets[0]
    reputationAmount: number; // Token amount (weight)
    timestamp: number;       // Block timestamp
    transactionId: string;   // Transaction ID
}

// --- UNAVAILABLE_SOURCE (Box Type 5) ---
// Represents an opinion that a specific URL is no longer available.
export interface UnavailableSource {
    id: string;              // Box ID of this opinion
    sourceUrl: string;       // R5: The URL being marked as unavailable
    authorTokenId: string;   // Reputation Token ID from assets[0]
    reputationAmount: number; // Token amount (weight)
    timestamp: number;       // Block timestamp
    transactionId: string;   // Transaction ID
}

// --- PROFILE_OPINION (Box Type 3) ---
// Represents trusting a User/Profile rather than a specific box.
// Provides persistent trust mechanism when sources update.
export interface ProfileOpinion {
    id: string;              // Box ID of the opinion
    targetProfileTokenId: string; // R5: Reputation Token ID of the user being trusted
    isTrusted: boolean;      // R8: true=trust, false=distrust
    authorTokenId: string;   // Reputation Token ID from assets[0] (who is giving the opinion)
    reputationAmount: number; // Token amount (trust weight)
    timestamp: number;       // Block timestamp
    transactionId: string;   // Transaction ID
}

// --- TIMELINE DATA STRUCTURES ---

export interface TimelineEvent {
    timestamp: number;
    type: 'FILE_SOURCE' | 'INVALID_FILE_SOURCE' | 'UNAVAILABLE_SOURCE' | 'PROFILE_OPINION';
    label: string;
    color: string;
    authorTokenId?: string;
    data: any;
}

// --- AGGREGATED DATA STRUCTURES ---

/**
 * File source with aggregated opinion data
 */
export interface FileSourceWithScore extends FileSource {
    confirmations: FileSource[];      // Other FILE_SOURCE boxes with same hash and URL
    invalidations: InvalidFileSource[]; // INVALID_FILE_SOURCE boxes for this boxId
    unavailabilities: UnavailableSource[]; // UNAVAILABLE_SOURCE boxes for this URL

    confirmationScore: number; // Sum of reputation in confirmations
    invalidationScore: number; // Sum of reputation in invalidations
    unavailabilityScore: number; // Sum of reputation in unavailabilities

    ownerTrustScore: number; // Trust score of the source owner
}

// --- GROUPED DATA STRUCTURES ---

/**
 * Data for a unique download source (URL)
 */
export interface DownloadSourceGroup {
    sourceUrl: string;
    sources: FileSource[]; // All FILE_SOURCE boxes for this URL
    owners: string[];      // Unique owner token IDs
    invalidations: InvalidFileSource[]; // All invalidations for all sources in this group
    unavailabilities: UnavailableSource[]; // All unavailabilities for this URL
}

/**
 * Data for a specific profile's contributions to a hash
 */
export interface ProfileSourceGroup {
    profileTokenId: string;
    sources: FileSource[]; // FILE_SOURCE boxes by this profile
    // Each source in this group will have its own invalidations and unavailabilities
}

// --- HELPER FUNCTIONS ---

/**
 * Group file sources by their download URL.
 */
export function groupByDownloadSource(
    sources: FileSource[],
    invalidationsMap: Record<string, { data: InvalidFileSource[] }>,
    unavailabilitiesMap: Record<string, { data: UnavailableSource[] }>
): DownloadSourceGroup[] {
    const groups: Record<string, DownloadSourceGroup> = {};

    for (const source of sources) {
        if (!groups[source.sourceUrl]) {
            groups[source.sourceUrl] = {
                sourceUrl: source.sourceUrl,
                sources: [],
                owners: [],
                invalidations: [],
                unavailabilities: unavailabilitiesMap[source.sourceUrl]?.data || []
            };
        }

        groups[source.sourceUrl].sources.push(source);
        if (!groups[source.sourceUrl].owners.includes(source.ownerTokenId)) {
            groups[source.sourceUrl].owners.push(source.ownerTokenId);
        }

        // Add invalidations for this specific box
        const boxInvalidations = invalidationsMap[source.id]?.data || [];
        groups[source.sourceUrl].invalidations.push(...boxInvalidations);
    }

    return Object.values(groups).sort((a, b) => b.sources.length - a.sources.length);
}

/**
 * Group file sources by the profile that submitted them.
 */
export function groupByProfile(sources: FileSource[]): ProfileSourceGroup[] {
    const groups: Record<string, ProfileSourceGroup> = {};

    for (const source of sources) {
        if (!groups[source.ownerTokenId]) {
            groups[source.ownerTokenId] = {
                profileTokenId: source.ownerTokenId,
                sources: []
            };
        }
        groups[source.ownerTokenId].sources.push(source);
    }

    return Object.values(groups).sort((a, b) => b.sources.length - a.sources.length);
}

/**
 * Calculate the trust score for a profile based on PROFILE_OPINION boxes.
 */
export function calculateProfileTrust(
    profileTokenId: string,
    opinions: ProfileOpinion[]
): number {
    const trust = opinions
        .filter(op => op.isTrusted)
        .reduce((sum, op) => sum + op.reputationAmount, 0);

    const distrust = opinions
        .filter(op => !op.isTrusted)
        .reduce((sum, op) => sum + op.reputationAmount, 0);

    return trust - distrust;
}

/**
 * Aggregate opinions into score data for a file source.
 */
export function aggregateSourceScore(
    source: FileSource,
    allSources: FileSource[],
    invalidations: InvalidFileSource[],
    unavailabilities: UnavailableSource[],
    profileOpinions: ProfileOpinion[] = []
): FileSourceWithScore {
    // Confirmations are other sources with same hash and URL
    const confirmations = allSources.filter(s =>
        s.id !== source.id &&
        s.fileHash === source.fileHash &&
        s.sourceUrl === source.sourceUrl
    );

    // Invalidations for this specific box
    const filteredInvalidations = invalidations.filter(inv => inv.targetBoxId === source.id);

    // Unavailabilities for this specific URL
    const filteredUnavailabilities = unavailabilities.filter(un => un.sourceUrl === source.sourceUrl);

    const confirmationScore = confirmations.reduce((sum, s) => sum + s.reputationAmount, 0);
    const invalidationScore = filteredInvalidations.reduce((sum, inv) => sum + inv.reputationAmount, 0);
    const unavailabilityScore = filteredUnavailabilities.reduce((sum, un) => sum + un.reputationAmount, 0);

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
