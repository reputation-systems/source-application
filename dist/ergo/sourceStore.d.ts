import { type ReputationProof } from 'reputation-system';
import { type FileSource } from './sourceObject';
/**
 * Creates a user profile box (same as forum).
 */
export declare function createProfileBox(explorerUri: string): Promise<string>;
/**
 * Add a new FILE_SOURCE box.
 * Creates a box with R5=fileHash, R9=sourceUrl.
 */
export declare function addFileSource(fileHash: string, sourceUrl: string, proof: ReputationProof | null, explorerUri: string): Promise<string>;
/**
 * Update a FILE_SOURCE box (spend old, create new with same hash but new URL).
 * The old box must be owned by the current user.
 */
export declare function updateFileSource(oldBoxId: string, fileHash: string, newSourceUrl: string, proof: ReputationProof | null, explorerUri: string): Promise<string>;
/**
 * Confirm a FILE_SOURCE box.
 * Creates a new FILE_SOURCE box with same hash and URL.
 */
export declare function confirmSource(fileHash: string, sourceUrl: string, proof: ReputationProof | null, currentSources: FileSource[], explorerUri: string): Promise<string>;
/**
 * Mark a FILE_SOURCE box as invalid.
 * Creates an INVALID_FILE_SOURCE box with R5=sourceBoxId.
 */
export declare function markInvalidSource(sourceBoxId: string, proof: ReputationProof | null, explorerUri: string): Promise<string>;
/**
 * Mark a source URL as unavailable.
 * Creates an UNAVAILABLE_SOURCE box with R5=sourceUrl.
 */
export declare function markUnavailableSource(sourceUrl: string, proof: ReputationProof | null, explorerUri: string): Promise<string>;
/**
 * Trust or distrust a profile.
 * Creates a PROFILE_OPINION box with R5=profileTokenId, R8=isTrusted.
 */
export declare function trustProfile(profileTokenId: string, isTrusted: boolean, proof: ReputationProof | null, explorerUri: string): Promise<string>;
