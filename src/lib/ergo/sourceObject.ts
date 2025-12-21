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

// --- HELPER FUNCTIONS ---

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
