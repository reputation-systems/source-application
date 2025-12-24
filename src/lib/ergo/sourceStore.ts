import { generate_reputation_proof } from './submit';
import { type RPBox, type ReputationProof } from '$lib/ergo/object';
import {
    fetchFileSourcesByHash,
    fetchInvalidFileSources,
    fetchUnavailableSources,
    fetchProfileOpinions,
    fetchProfileOpinionsByAuthor,
    fetchFileSourcesByProfile,
    fetchInvalidFileSourcesByProfile,
    fetchUnavailableSourcesByProfile
} from './sourceFetch';
import {
    FILE_SOURCE_TYPE_NFT_ID,
    INVALID_FILE_SOURCE_TYPE_NFT_ID,
    UNAVAILABLE_SOURCE_TYPE_NFT_ID,
    PROFILE_OPINION_TYPE_NFT_ID,
    PROFILE_TOTAL_SUPPLY,
    PROFILE_TYPE_NFT_ID,
} from './envs';
import { type FileSource, type InvalidFileSource, type UnavailableSource, type ProfileOpinion } from './sourceObject';

// --- PROFILE MANAGEMENT ---

/**
 * Creates a user profile box (same as forum).
 */
export async function createProfileBox(explorerUri: string): Promise<string> {
    const profileTxId = await generate_reputation_proof(
        PROFILE_TOTAL_SUPPLY,
        PROFILE_TOTAL_SUPPLY,
        PROFILE_TYPE_NFT_ID,
        undefined,
        true,
        { name: "Anon" },
        false, // Profile box should NOT be locked
        explorerUri,
        undefined
    );

    if (!profileTxId) {
        throw new Error("Fatal error: The profile creation transaction failed to send.");
    }

    console.warn(
        "User profile not found. A new one has been created. Please wait ~2 minutes for the transaction to confirm and try again."
    );

    return profileTxId;
}

/**
 * Gets the main box (the one with the most tokens) from the provided reputation proof.
 * If the proof is null/empty, it attempts to create the initial profile proof.
 */
async function getOrCreateProfileBox(proof: ReputationProof | null, explorerUri: string, r4?: string, r5?: string): Promise<RPBox | null> {
    if (!proof || !proof.current_boxes || proof.current_boxes.length === 0) {
        console.log("No user reputation proof found. Creating profile proof...");
        await createProfileBox(explorerUri);
        return null;
    } else {
        // If r4 and r5 are provided, try to find a specific box
        if (r4 && r5) {
            const specificBox = proof.current_boxes.find(box =>
                box.type.tokenId === r4 &&
                box.object_pointer === r5
            );
            if (specificBox) {
                console.log("Using specific box as input:", specificBox.box_id, "for R4/R5:", r4, r5);
                return specificBox;
            }
        }

        const mainBox = proof.current_boxes.find(box =>
            box.type.tokenId === PROFILE_TYPE_NFT_ID &&
            box.object_pointer === proof.token_id
        );

        if (!mainBox) {
            console.warn("Main profile box not found in current boxes. Creating a new one...");
            await createProfileBox(explorerUri);
            return null;
        }

        if (mainBox.is_locked) {
            throw new Error("Error: Your main profile box is locked (is_locked=true) and cannot be spent.");
        }
        if (mainBox.token_amount < 1) {
            throw new Error("Error: You do not have enough reputation tokens left in your main box to perform this action.");
        }

        console.log(
            "Using existing profile box as input:",
            mainBox.box_id,
            "with profile token:",
            mainBox.token_id
        );
        return mainBox;
    }
}

// --- TRANSACTION FUNCTIONS ---

/**
 * Add a new FILE_SOURCE box.
 * Creates a box with R5=fileHash, R9=sourceUrl.
 */
export async function addFileSource(fileHash: string, sourceUrl: string, proof: ReputationProof | null, explorerUri: string): Promise<string> {
    console.log("API: addFileSource", { fileHash, sourceUrl });

    const inputProofBox = await getOrCreateProfileBox(proof, explorerUri);
    if (!inputProofBox) {
        throw new Error("Profile box required but not available yet. Please wait for profile creation to confirm.");
    }

    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        FILE_SOURCE_TYPE_NFT_ID,
        fileHash,           // R5: file hash
        true,               // R8: not used for FILE_SOURCE, but required by function
        sourceUrl,          // R9: source URL
        false,              // R6: unlocked (false)
        explorerUri,
        inputProofBox
    );

    if (!tx) throw new Error("File source transaction failed.");
    console.log("File source transaction sent, ID:", tx);

    return tx;
}

/**
 * Update a FILE_SOURCE box (spend old, create new with same hash but new URL).
 * The old box must be owned by the current user.
 */
export async function updateFileSource(
    oldBoxId: string,
    fileHash: string,
    newSourceUrl: string,
    proof: ReputationProof | null,
    explorerUri: string
): Promise<string> {
    console.log("API: updateFileSource", { oldBoxId, fileHash, newSourceUrl });

    const inputProofBox = await getOrCreateProfileBox(proof, explorerUri, FILE_SOURCE_TYPE_NFT_ID, fileHash);
    if (!inputProofBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        FILE_SOURCE_TYPE_NFT_ID,
        fileHash,
        true,
        newSourceUrl,
        false,
        explorerUri,
        inputProofBox
    );

    if (!tx) throw new Error("File source update transaction failed.");
    console.log("File source update transaction sent, ID:", tx);

    return tx;
}

/**
 * Confirm a FILE_SOURCE box.
 * Creates a new FILE_SOURCE box with same hash and URL.
 */
export async function confirmSource(fileHash: string, sourceUrl: string, proof: ReputationProof | null, currentSources: FileSource[], explorerUri: string): Promise<string> {
    console.log("API: confirmSource", { fileHash, sourceUrl });

    // Safety check: has the user already confirmed this?
    const userTokenId = proof?.token_id;

    if (userTokenId && currentSources.some(s => s.sourceUrl === sourceUrl && s.ownerTokenId === userTokenId)) {
        throw new Error("You have already confirmed this source.");
    }

    return await addFileSource(fileHash, sourceUrl, proof, explorerUri);
}

/**
 * Mark a FILE_SOURCE box as invalid.
 * Creates an INVALID_FILE_SOURCE box with R5=sourceBoxId.
 */
export async function markInvalidSource(sourceBoxId: string, proof: ReputationProof | null, explorerUri: string): Promise<string> {
    console.log("API: markInvalidSource", { sourceBoxId });

    const inputProofBox = await getOrCreateProfileBox(proof, explorerUri);
    if (!inputProofBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        INVALID_FILE_SOURCE_TYPE_NFT_ID,
        sourceBoxId,        // R5: target box ID
        false,              // R8: not used
        null,               // R9: no content needed
        false,               // R6: unlocked
        explorerUri,
        inputProofBox
    );

    if (!tx) throw new Error("Invalid source transaction failed.");
    console.log("Invalid source transaction sent, ID:", tx);

    return tx;
}

/**
 * Mark a source URL as unavailable.
 * Creates an UNAVAILABLE_SOURCE box with R5=sourceUrl.
 */
export async function markUnavailableSource(sourceUrl: string, proof: ReputationProof | null, explorerUri: string): Promise<string> {
    console.log("API: markUnavailableSource", sourceUrl);

    const inputProofBox = await getOrCreateProfileBox(proof, explorerUri);
    if (!inputProofBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        UNAVAILABLE_SOURCE_TYPE_NFT_ID,
        sourceUrl,          // R5: source URL
        false,              // R8: not used
        null,               // R9: no content needed
        false,               // R6: unlocked
        explorerUri,
        inputProofBox
    );

    if (!tx) throw new Error("Unavailable source transaction failed.");
    console.log("Unavailable source transaction sent, ID:", tx);

    return tx;
}

/**
 * Trust or distrust a profile.
 * Creates a PROFILE_OPINION box with R5=profileTokenId, R8=isTrusted.
 */
export async function trustProfile(profileTokenId: string, isTrusted: boolean, proof: ReputationProof | null, explorerUri: string): Promise<string> {
    console.log("API: trustProfile", { profileTokenId, isTrusted });

    const inputProofBox = await getOrCreateProfileBox(proof, explorerUri);
    if (!inputProofBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        PROFILE_OPINION_TYPE_NFT_ID,
        profileTokenId,     // R5: target profile token ID
        isTrusted,          // R8: trust/distrust
        null,               // R9: no content needed
        false,              // R6: unlocked (allow trust changes)
        explorerUri,
        inputProofBox
    );

    if (!tx) throw new Error("Profile opinion transaction failed.");
    console.log("Profile opinion transaction sent, ID:", tx);

    return tx;
}

// --- FETCH ACTIONS (Return data, do not update stores) ---

export interface SearchResult {
    sources: FileSource[];
    invalidations: { [sourceId: string]: InvalidFileSource[] };
    unavailabilities: { [sourceUrl: string]: UnavailableSource[] };
}

/**
 * Load file sources by hash.
 */
export async function searchByHash(fileHash: string, explorerUri: string): Promise<SearchResult> {
    const sources = await fetchFileSourcesByHash(fileHash, explorerUri);
    const invalidations: { [sourceId: string]: InvalidFileSource[] } = {};
    const unavailabilities: { [sourceUrl: string]: UnavailableSource[] } = {};

    for (const source of sources) {
        // Fetch invalidations for this box
        const invs = await fetchInvalidFileSources(source.id, explorerUri);
        if (invs.length > 0) invalidations[source.id] = invs;

        // Fetch unavailabilities for this URL
        // Optimization: check if we already fetched for this URL
        if (!unavailabilities[source.sourceUrl]) {
            const unavs = await fetchUnavailableSources(source.sourceUrl, explorerUri);
            if (unavs.length > 0) unavailabilities[source.sourceUrl] = unavs;
        }
    }

    return { sources, invalidations, unavailabilities };
}

export interface ProfileData {
    sources: FileSource[];
    invalidations: InvalidFileSource[];
    unavailabilities: UnavailableSource[];
    opinions: ProfileOpinion[];
    opinionsGiven: ProfileOpinion[];
}

/**
 * Load all data related to a profile.
 */
export async function loadProfileData(profileTokenId: string, explorerUri: string): Promise<ProfileData> {
    const sources = await fetchFileSourcesByProfile(profileTokenId, 50, explorerUri);
    const invalidations = await fetchInvalidFileSourcesByProfile(profileTokenId, 50, explorerUri);
    const unavailabilities = await fetchUnavailableSourcesByProfile(profileTokenId, 50, explorerUri);
    const opinions = await fetchProfileOpinions(profileTokenId, explorerUri);
    const opinionsGiven = await fetchProfileOpinionsByAuthor(profileTokenId, 50, explorerUri);

    return {
        sources,
        invalidations,
        unavailabilities,
        opinions,
        opinionsGiven
    };
}

