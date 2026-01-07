import { create_profile, create_opinion, update_opinion, remove_opinion } from 'reputation-system';
import { type RPBox, type ReputationProof } from 'reputation-system';
import { type FileSource } from './sourceObject';
import {
    FILE_SOURCE_TYPE_NFT_ID,
    INVALID_FILE_SOURCE_TYPE_NFT_ID,
    UNAVAILABLE_SOURCE_TYPE_NFT_ID,
    PROFILE_OPINION_TYPE_NFT_ID,
    PROFILE_TOTAL_SUPPLY,
    PROFILE_TYPE_NFT_ID,
} from './envs';

/**
 * Gets the main profile box from a ReputationProof.
 * Returns the first box with PROFILE_TYPE_NFT_ID as its type.
 */
function getMainProfileBox(proof: ReputationProof | null): RPBox | null {
    if (!proof) return null;
    return proof.current_boxes.find((b: RPBox) => b.object_pointer === proof.token_id) || null;
}

// --- PROFILE MANAGEMENT ---

/**
 * Creates a user profile box (same as forum).
 */
export async function createProfileBox(explorerUri: string): Promise<string> {
    const profileTxId = await create_profile(
        PROFILE_TOTAL_SUPPLY,
        PROFILE_TYPE_NFT_ID,
        explorerUri,
        { name: "Anon" }
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
 * Add a new FILE_SOURCE box.
 * Creates a box with R5=fileHash, R9=sourceUrl.
 */
export async function addFileSource(fileHash: string, sourceUrl: string, proof: ReputationProof | null, explorerUri: string): Promise<string> {
    console.log("API: addFileSource", { fileHash, sourceUrl });

    console.log("Proof:", proof);

    if (!proof) {
        throw new Error("Reputation proof is required to add a file source.");
    }

    const mainBox = getMainProfileBox(proof);
    console.log("Opinion box (profile):", mainBox);

    if (!mainBox) {
        throw new Error("Profile box required but not available yet. Please wait for profile creation to confirm.");
    }

    const tx = await create_opinion(
        explorerUri,                // explorerUri: Explorer API endpoint
        1,                          // token_amount: 1 token for the new file source box
        FILE_SOURCE_TYPE_NFT_ID,    // type_nft_id: Type NFT for FILE_SOURCE
        fileHash,                   // object_pointer: R5 - The file hash
        true,                       // polarization: R8 - Positive opinion
        sourceUrl,                  // content: R9 - The source URL
        false,                      // is_locked: R6 - Unlocked
        mainBox                     // main_box: The profile box to split from
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

    // Find the existing file source box to update
    const existingBox = proof?.current_boxes.find((b: RPBox) => b.box.boxId === oldBoxId) || null;
    if (!existingBox) {
        throw new Error("File source box to update not found.");
    }

    const tx = await update_opinion(
        explorerUri,
        existingBox,
        true,
        newSourceUrl
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

    const mainBox = getMainProfileBox(proof);
    if (!mainBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await create_opinion(
        explorerUri,
        1,
        INVALID_FILE_SOURCE_TYPE_NFT_ID,
        sourceBoxId,
        false,
        null,
        false,
        mainBox
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

    const mainBox = getMainProfileBox(proof);
    if (!mainBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await create_opinion(
        explorerUri,
        1,
        UNAVAILABLE_SOURCE_TYPE_NFT_ID,
        sourceUrl,
        false,
        null,
        false,
        mainBox
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

    const opinionBox = getMainProfileBox(proof);
    if (!opinionBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await create_opinion(
        explorerUri,
        1,
        PROFILE_OPINION_TYPE_NFT_ID,
        profileTokenId,
        isTrusted,
        null,
        false,
        opinionBox
    );

    if (!tx) throw new Error("Profile opinion transaction failed.");
    console.log("Profile opinion transaction sent, ID:", tx);

    return tx;
}



