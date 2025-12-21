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

// --- SOURCE_OPINION (Box Type 2) ---
// Represents user feedback on a specific version of a source.
// Verifies if the source URL is correct, not an opinion about the file itself.
export interface SourceOpinion {
    id: string;              // Box ID of the opinion
    targetBoxId: string;     // R5: The specific box ID being rated (immutable target)
    isPositive: boolean;     // R8: true=positive, false=negative
    authorTokenId: string;   // Reputation Token ID from assets[0]
    reputationAmount: number; // Token amount (voting weight)
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
    directOpinions: SourceOpinion[];
    positiveScore: number;   // Sum of positive reputation
    negativeScore: number;   // Sum of negative reputation
    netScore: number;        // positiveScore - negativeScore
    ownerTrustScore: number; // Trust score of the source owner
}

// --- HELPER FUNCTIONS (MOCKS) ---

/**
 * Calculate the aggregate score for a file source based on direct opinions.
 * MOCK IMPLEMENTATION - replace with actual logic when needed.
 */
export function calculateSourceScore(
    source: FileSource,
    opinions: SourceOpinion[]
): number {
    // Mock: just return a random score for now
    return Math.floor(Math.random() * 100) - 50;
}

/**
 * Calculate the trust score for a profile based on PROFILE_OPINION boxes.
 * MOCK IMPLEMENTATION - replace with actual logic when needed.
 */
export function calculateProfileTrust(
    profileTokenId: string,
    opinions: ProfileOpinion[]
): number {
    // Mock: just return a random score for now
    return Math.floor(Math.random() * 100);
}

/**
 * Aggregate opinions into score data for a file source.
 */
export function aggregateSourceScore(
    source: FileSource,
    opinions: SourceOpinion[],
    profileOpinions: ProfileOpinion[] = []
): FileSourceWithScore {
    const positiveScore = opinions
        .filter(op => op.isPositive)
        .reduce((sum, op) => sum + op.reputationAmount, 0);

    const negativeScore = opinions
        .filter(op => !op.isPositive)
        .reduce((sum, op) => sum + op.reputationAmount, 0);

    const ownerTrustScore = calculateProfileTrust(source.ownerTokenId, profileOpinions);

    return {
        ...source,
        directOpinions: opinions,
        positiveScore,
        negativeScore,
        netScore: positiveScore - negativeScore,
        ownerTrustScore
    };
}
