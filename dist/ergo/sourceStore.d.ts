import { type ReputationProof } from 'reputation-system';
import { type FileSource, type SourceEntry } from './sourceObject';
/**
 * Creates a user profile box (same as forum).
 */
export declare function createProfileBox(explorerUri: string): Promise<string>;
/**
 * Add a new FILE_SOURCE box.
 * Creates a box with R5=fileHash (raw file hash), R9=serialized source entries.
 *
 * @param fileHash - The raw file hash digest (R5 anchor)
 * @param hashFunctionId - ID of the hash function used (HASH(EMPTY_INPUT))
 * @param sourceEntry - Single SourceEntry object for R9
 * @param proof - User's reputation proof
 * @param explorerUri - Explorer API endpoint
 */
export declare function addFileSource(fileHash: string, hashFunctionId: string, sourceEntry: SourceEntry, proof: ReputationProof | null, explorerUri: string): Promise<string>;
/**
 * Update a FILE_SOURCE box (spend old, create new with same hash but new source entries).
 * The old box must be owned by the current user.
 *
 * @param oldBoxId - Box ID of the existing FILE_SOURCE to update
 * @param fileHash - The raw file hash (must match existing)
 * @param newSourceEntry - New SourceEntry object for R9
 * @param proof - User's reputation proof
 * @param explorerUri - Explorer API endpoint
 */
export declare function updateFileSource(oldBoxId: string, fileHash: string, newSourceEntry: SourceEntry, proof: ReputationProof | null, explorerUri: string): Promise<string>;
/**
 * Confirm a FILE_SOURCE box.
 * Creates a new FILE_SOURCE box with same hash and source entries.
 */
export declare function confirmSource(fileHash: string, hashFunctionId: string, sourceEntry: SourceEntry, proof: ReputationProof | null, currentSources: FileSource[], explorerUri: string): Promise<string>;
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
