import { generate_reputation_proof } from 'ergo-reputation-system';
import { type RPBox, type ReputationProof } from 'ergo-reputation-system';
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
    return proof.current_boxes.find((b: RPBox) => b.type.tokenId === PROFILE_TYPE_NFT_ID) || null;
}

// --- PROFILE MANAGEMENT ---

/**
 * Creates a user profile box (same as forum).
 */
export async function createProfileBox(explorerUri: string): Promise<string> {
    const profileTxId = await generate_reputation_proof(
        PROFILE_TOTAL_SUPPLY,   // token_amount: Amount of reputation tokens for new box
        PROFILE_TOTAL_SUPPLY,   // total_supply: Total supply when minting new token
        PROFILE_TYPE_NFT_ID,    // type_nft_id: Type NFT that defines this proof standard
        undefined,              // object_pointer: R5 - Points to self (token ID) for profiles
        true,                   // polarization: R8 - Not used for profiles, default true
        { name: "Anon" },       // content: R9 - Profile metadata JSON
        false,                  // is_locked: R6 - Profile box should NOT be locked
        undefined,              // opinion_box: No existing box (minting new)
        [],                     // main_boxes: No liquidity boxes needed
        0n,                     // extra_erg: No extra ERG to add
        [],                     // extra_tokens: No extra tokens to sacrifice
        explorerUri             // explorerUri: Explorer API endpoint
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

    const opinionBox = getMainProfileBox(proof);
    console.log("Opinion box (profile):", opinionBox);

    if (!opinionBox) {
        throw new Error("Profile box required but not available yet. Please wait for profile creation to confirm.");
    }

    const tx = await generate_reputation_proof(
        1,                          // token_amount: 1 token for this file source opinion
        PROFILE_TOTAL_SUPPLY,       // total_supply: Not used when modifying existing proof
        FILE_SOURCE_TYPE_NFT_ID,    // type_nft_id: Type NFT for FILE_SOURCE
        fileHash,                   // object_pointer: R5 - The file hash this source refers to
        true,                       // polarization: R8 - Positive (source exists)
        sourceUrl,                  // content: R9 - The URL where the file can be found
        false,                      // is_locked: R6 - Unlocked (can be updated)
        opinionBox,                 // opinion_box: The profile box to split from
        [],                         // main_boxes: No additional liquidity boxes
        0n,                         // extra_erg: No extra ERG
        [],                         // extra_tokens: No extra tokens
        explorerUri                 // explorerUri: Explorer API endpoint
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

    const tx = await generate_reputation_proof(
        1,                          // token_amount: Keep 1 token in updated box
        PROFILE_TOTAL_SUPPLY,       // total_supply: Not used when modifying
        FILE_SOURCE_TYPE_NFT_ID,    // type_nft_id: Type NFT for FILE_SOURCE
        fileHash,                   // object_pointer: R5 - Same file hash
        true,                       // polarization: R8 - Positive
        newSourceUrl,               // content: R9 - Updated URL
        false,                      // is_locked: R6 - Unlocked
        existingBox,                // opinion_box: The existing file source box to update
        [],                         // main_boxes: No additional liquidity boxes
        0n,                         // extra_erg: No extra ERG
        [],                         // extra_tokens: No extra tokens
        explorerUri                 // explorerUri: Explorer API endpoint
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

    const opinionBox = getMainProfileBox(proof);
    if (!opinionBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await generate_reputation_proof(
        1,                              // token_amount: 1 token for this invalidation opinion
        PROFILE_TOTAL_SUPPLY,           // total_supply: Not used when modifying
        INVALID_FILE_SOURCE_TYPE_NFT_ID, // type_nft_id: Type NFT for INVALID_FILE_SOURCE
        sourceBoxId,                    // object_pointer: R5 - The box ID being invalidated
        false,                          // polarization: R8 - Negative (marking as invalid)
        null,                           // content: R9 - No additional content
        false,                          // is_locked: R6 - Unlocked
        opinionBox,                     // opinion_box: The profile box to split from
        [],                             // main_boxes: No additional liquidity boxes
        0n,                             // extra_erg: No extra ERG
        [],                             // extra_tokens: No extra tokens
        explorerUri                     // explorerUri: Explorer API endpoint
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

    const opinionBox = getMainProfileBox(proof);
    if (!opinionBox) {
        throw new Error("Profile box required but not available yet.");
    }

    const tx = await generate_reputation_proof(
        1,                              // token_amount: 1 token for this unavailability opinion
        PROFILE_TOTAL_SUPPLY,           // total_supply: Not used when modifying
        UNAVAILABLE_SOURCE_TYPE_NFT_ID, // type_nft_id: Type NFT for UNAVAILABLE_SOURCE
        sourceUrl,                      // object_pointer: R5 - The URL being marked unavailable
        false,                          // polarization: R8 - Negative (unavailable)
        null,                           // content: R9 - No additional content
        false,                          // is_locked: R6 - Unlocked
        opinionBox,                     // opinion_box: The profile box to split from
        [],                             // main_boxes: No additional liquidity boxes
        0n,                             // extra_erg: No extra ERG
        [],                             // extra_tokens: No extra tokens
        explorerUri                     // explorerUri: Explorer API endpoint
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

    const tx = await generate_reputation_proof(
        1,                          // token_amount: 1 token for this trust opinion
        PROFILE_TOTAL_SUPPLY,       // total_supply: Not used when modifying
        PROFILE_OPINION_TYPE_NFT_ID, // type_nft_id: Type NFT for PROFILE_OPINION
        profileTokenId,             // object_pointer: R5 - The profile token ID being rated
        isTrusted,                  // polarization: R8 - true=trust, false=distrust
        null,                       // content: R9 - No additional content
        false,                      // is_locked: R6 - Unlocked (allow trust changes)
        opinionBox,                 // opinion_box: The profile box to split from
        [],                         // main_boxes: No additional liquidity boxes
        0n,                         // extra_erg: No extra ERG
        [],                         // extra_tokens: No extra tokens
        explorerUri                 // explorerUri: Explorer API endpoint
    );

    if (!tx) throw new Error("Profile opinion transaction failed.");
    console.log("Profile opinion transaction sent, ID:", tx);

    return tx;
}

// --- FETCH ACTIONS (Return data, do not update stores) ---






