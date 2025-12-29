import { type FileSource, type ProfileOpinion, type SearchResult, type ProfileData, type InvalidFileSource, type UnavailableSource } from './sourceObject';
/**
 * Fetch all FILE_SOURCE boxes for a specific file hash.
 * Returns all sources (URLs) where this file can be found.
 */
export declare function fetchFileSourcesByHash(fileHash: string, explorerUri: string): Promise<FileSource[]>;
/**
 * Fetch all INVALID_FILE_SOURCE boxes for a specific source box.
 */
export declare function fetchInvalidFileSources(sourceBoxId: string, explorerUri: string): Promise<InvalidFileSource[]>;
/**
 * Fetch all UNAVAILABLE_SOURCE boxes for a specific URL.
 */
export declare function fetchUnavailableSources(sourceUrl: string, explorerUri: string): Promise<UnavailableSource[]>;
/**
 * Fetch all PROFILE_OPINION boxes targeting a specific profile.
 * Returns all trust/distrust opinions for this profile.
 */
export declare function fetchProfileOpinions(profileTokenId: string, explorerUri: string): Promise<ProfileOpinion[]>;
/**
 * Fetch all FILE_SOURCE boxes for a specific profile token ID.
 * Returns file sources created by this profile.
 */
export declare function fetchFileSourcesByProfile(profileTokenId: string, limit: number | undefined, explorerUri: string): Promise<FileSource[]>;
/**
 * Fetch all INVALID_FILE_SOURCE boxes created by a specific profile.
 */
export declare function fetchInvalidFileSourcesByProfile(profileTokenId: string, limit: number | undefined, explorerUri: string): Promise<InvalidFileSource[]>;
/**
 * Fetch all UNAVAILABLE_SOURCE boxes created by a specific profile.
 */
export declare function fetchUnavailableSourcesByProfile(profileTokenId: string, limit: number | undefined, explorerUri: string): Promise<UnavailableSource[]>;
/**
 * Fetch all PROFILE_OPINION boxes created by a specific profile.
 */
export declare function fetchProfileOpinionsByAuthor(authorTokenId: string, explorerUri: string): Promise<ProfileOpinion[]>;
/**
 * Load file sources by hash.
 */
export declare function searchByHash(fileHash: string, explorerUri: string): Promise<SearchResult>;
/**
 * Load all data related to a profile.
 */
export declare function loadProfileData(profileTokenId: string, explorerUri: string): Promise<ProfileData>;
