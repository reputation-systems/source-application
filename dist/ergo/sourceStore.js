import { create_profile, create_opinion, update_opinion } from 'reputation-system';
import { serializeSourceEntry } from './sourceObject';
import { FILE_SOURCE_TYPE_NFT_ID, INVALID_FILE_SOURCE_TYPE_NFT_ID, UNAVAILABLE_SOURCE_TYPE_NFT_ID, PROFILE_OPINION_TYPE_NFT_ID, PROFILE_TOTAL_SUPPLY, PROFILE_TYPE_NFT_ID, } from './envs';
/**
 * Gets the main profile box from a ReputationProof.
 * Returns the first box with PROFILE_TYPE_NFT_ID as its type.
 */
function getMainProfileBox(proof) {
    if (!proof)
        return null;
    return proof.current_boxes.find((b) => b.object_pointer === proof.token_id) || null;
}
// --- PROFILE MANAGEMENT ---
/**
 * Creates a user profile box (same as forum).
 */
export async function createProfileBox(explorerUri) {
    const profileTxId = await create_profile(explorerUri, PROFILE_TOTAL_SUPPLY, PROFILE_TYPE_NFT_ID, { name: "Anon" });
    if (!profileTxId) {
        throw new Error("Fatal error: The profile creation transaction failed to send.");
    }
    console.warn("User profile not found. A new one has been created. Please wait ~2 minutes for the transaction to confirm and try again.");
    return profileTxId;
}
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
export async function addFileSource(fileHash, hashFunctionId, sourceEntry, proof, explorerUri) {
    console.log("API: addFileSource", { fileHash, hashFunctionId, sourceEntry });
    console.log("Proof:", proof);
    if (!proof) {
        throw new Error("Reputation proof is required to add a file source.");
    }
    const mainBox = getMainProfileBox(proof);
    console.log("Opinion box (profile):", mainBox);
    if (!mainBox) {
        throw new Error("Profile box required but not available yet. Please wait for profile creation to confirm.");
    }
    // Serialize single source entry as JSON for R9 content
    const serializedContent = serializeSourceEntry(sourceEntry);
    const tx = await create_opinion(explorerUri, // explorerUri: Explorer API endpoint
    1, // token_amount: 1 token for the new file source box
    FILE_SOURCE_TYPE_NFT_ID, // type_nft_id: Type NFT for FILE_SOURCE
    fileHash, // object_pointer: R5 - The raw file hash
    true, // polarization: R8 - Positive opinion
    serializedContent, // content: R9 - Serialized source entry
    false, // is_locked: R6 - Unlocked
    mainBox // main_box: The profile box to split from
    );
    if (!tx)
        throw new Error("File source transaction failed.");
    console.log("File source transaction sent, ID:", tx);
    return tx;
}
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
export async function updateFileSource(oldBoxId, fileHash, newSourceEntry, proof, explorerUri) {
    console.log("API: updateFileSource", { oldBoxId, fileHash, newSourceEntry });
    // Find the existing file source box to update
    const existingBox = proof?.current_boxes.find((b) => b.box.boxId === oldBoxId) || null;
    if (!existingBox) {
        throw new Error("File source box to update not found.");
    }
    // Serialize new source entry as JSON for R9 content
    const serializedContent = serializeSourceEntry(newSourceEntry);
    const tx = await update_opinion(explorerUri, existingBox, true, serializedContent);
    if (!tx)
        throw new Error("File source update transaction failed.");
    console.log("File source update transaction sent, ID:", tx);
    return tx;
}
/**
 * Confirm a FILE_SOURCE box.
 * Creates a new FILE_SOURCE box with same hash and source entries.
 */
export async function confirmSource(fileHash, hashFunctionId, sourceEntry, proof, currentSources, explorerUri) {
    console.log("API: confirmSource", { fileHash, sourceEntry });
    // Safety check: has the user already confirmed this?
    const userTokenId = proof?.token_id;
    const primaryUrl = sourceEntry.urlLink || '';
    if (userTokenId && currentSources.some(s => s.source?.urlLink === primaryUrl && s.ownerTokenId === userTokenId)) {
        throw new Error("You have already confirmed this source.");
    }
    return await addFileSource(fileHash, hashFunctionId, sourceEntry, proof, explorerUri);
}
/**
 * Mark a FILE_SOURCE box as invalid.
 * Creates an INVALID_FILE_SOURCE box with R5=sourceBoxId.
 */
export async function markInvalidSource(sourceBoxId, proof, explorerUri) {
    console.log("API: markInvalidSource", { sourceBoxId });
    const mainBox = getMainProfileBox(proof);
    if (!mainBox) {
        throw new Error("Profile box required but not available yet.");
    }
    const tx = await create_opinion(explorerUri, 1, INVALID_FILE_SOURCE_TYPE_NFT_ID, sourceBoxId, false, null, false, mainBox);
    if (!tx)
        throw new Error("Invalid source transaction failed.");
    console.log("Invalid source transaction sent, ID:", tx);
    return tx;
}
/**
 * Mark a source URL as unavailable.
 * Creates an UNAVAILABLE_SOURCE box with R5=sourceUrl.
 */
export async function markUnavailableSource(sourceUrl, proof, explorerUri) {
    console.log("API: markUnavailableSource", sourceUrl);
    const mainBox = getMainProfileBox(proof);
    if (!mainBox) {
        throw new Error("Profile box required but not available yet.");
    }
    const tx = await create_opinion(explorerUri, 1, UNAVAILABLE_SOURCE_TYPE_NFT_ID, sourceUrl, false, null, false, mainBox);
    if (!tx)
        throw new Error("Unavailable source transaction failed.");
    console.log("Unavailable source transaction sent, ID:", tx);
    return tx;
}
/**
 * Trust or distrust a profile.
 * Creates a PROFILE_OPINION box with R5=profileTokenId, R8=isTrusted.
 */
export async function trustProfile(profileTokenId, isTrusted, proof, explorerUri) {
    console.log("API: trustProfile", { profileTokenId, isTrusted });
    const opinionBox = getMainProfileBox(proof);
    if (!opinionBox) {
        throw new Error("Profile box required but not available yet.");
    }
    const tx = await create_opinion(explorerUri, 1, PROFILE_OPINION_TYPE_NFT_ID, profileTokenId, isTrusted, null, false, opinionBox);
    if (!tx)
        throw new Error("Profile opinion transaction failed.");
    console.log("Profile opinion transaction sent, ID:", tx);
    return tx;
}
