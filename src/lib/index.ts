// Source Application Library - Main Entry Point
// This library provides functions and components for decentralized file discovery and verification

// ===== SOURCE FETCH FUNCTIONS =====
export {
    fetchFileSourcesByHash,
    fetchInvalidFileSources,
    fetchUnavailableSources,
    fetchProfileOpinions,
    fetchFileSourcesByProfile,
    fetchInvalidFileSourcesByProfile,
    fetchUnavailableSourcesByProfile,
    fetchProfileOpinionsByAuthor,
    searchByHash,
    loadProfileData
} from './ergo/sourceFetch';

// ===== SOURCE STORE FUNCTIONS =====
export {
    createProfileBox,
    addFileSource,
    updateFileSource,
    confirmSource,
    markInvalidSource,
    markUnavailableSource,
    trustProfile
} from './ergo/sourceStore';

// ===== SOURCE OBJECT TYPES & HELPERS =====
export type {
    FileSource,
    InvalidFileSource,
    UnavailableSource,
    ProfileOpinion,
    TimelineEvent,
    FileSourceWithScore,
    DownloadSourceGroup,
    ProfileSourceGroup,
    SearchResult,
    ProfileData
} from './ergo/sourceObject';

export {
    groupByDownloadSource,
    groupByProfile,
    calculateProfileTrust,
    aggregateSourceScore
} from './ergo/sourceObject';

// ===== COMMON TYPES =====
export type {
    ReputationProof,
    RPBox,
    TypeNFT,
    ApiBox
} from './ergo/object';

// ===== ENVIRONMENT CONSTANTS =====
export {
    PROFILE_TYPE_NFT_ID,
    PROFILE_TOTAL_SUPPLY,
    FILE_SOURCE_TYPE_NFT_ID,
    INVALID_FILE_SOURCE_TYPE_NFT_ID,
    UNAVAILABLE_SOURCE_TYPE_NFT_ID,
    PROFILE_OPINION_TYPE_NFT_ID,
} from './ergo/envs';

// ===== SVELTE COMPONENTS =====
export { default as ProfileCard } from './components/ProfileCard.svelte';
export { default as FileSourceCreation } from './components/FileSourceCreation.svelte';
export { default as FileSourceCard } from './components/FileSourceCard.svelte';
export { default as FileCard } from './components/FileCard.svelte';