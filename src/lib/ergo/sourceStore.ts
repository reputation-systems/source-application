import { writable, get } from 'svelte/store';
import {
    reputation_proof,
    fileSources,
    currentSearchHash,
    invalidFileSources,
    unavailableSources,
    profileOpinions,
    profileInvalidations,
    profileUnavailabilities,
    profileOpinionsGiven,
    isLoading,
    error,
    CACHE_DURATION
} from './store';
import { generate_reputation_proof } from './submit';
import { type RPBox } from '$lib/ergo/object';
import {
    fetchFileSourcesByHash,
    fetchInvalidFileSources,
    fetchUnavailableSources,
    fetchProfileOpinions,
    fetchProfileOpinionsByAuthor,
    fetchAllFileSources,
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

// --- PROFILE MANAGEMENT ---

/**
 * Creates a user profile box (same as forum).
 */
export async function createProfileBox(): Promise<string> {
    const profileTxId = await generate_reputation_proof(
        PROFILE_TOTAL_SUPPLY,
        PROFILE_TOTAL_SUPPLY,
        PROFILE_TYPE_NFT_ID,
        undefined,
        true,
        { name: "Anon" },
        false, // Profile box should NOT be locked
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
 * Gets the main box (the one with the most tokens) from the 'reputation_proof' store.
 * If the store is empty, it attempts to create the initial profile proof.
 */
async function getOrCreateProfileBox(r4?: string, r5?: string): Promise<RPBox | null> {
    const proof = get(reputation_proof);

    if (!proof || !proof.current_boxes || proof.current_boxes.length === 0) {
        console.log("No user reputation proof found. Creating profile proof...");
        await createProfileBox();
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
            await createProfileBox();
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

/**
 * Helper to check if a cache entry is valid.
 */
function isEntryValid(entry: { timestamp: number } | undefined): boolean {
    if (!entry) return false;
    return (Date.now() - entry.timestamp) < CACHE_DURATION;
}

// --- TRANSACTION FUNCTIONS ---

/**
 * Add a new FILE_SOURCE box.
 * Creates a box with R5=fileHash, R9=sourceUrl.
 */
export async function addFileSource(fileHash: string, sourceUrl: string): Promise<string> {
    console.log("API: addFileSource", { fileHash, sourceUrl });

    const inputProofBox = await getOrCreateProfileBox();
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
    newSourceUrl: string
): Promise<string> {
    console.log("API: updateFileSource", { oldBoxId, fileHash, newSourceUrl });

    const inputProofBox = await getOrCreateProfileBox(FILE_SOURCE_TYPE_NFT_ID, fileHash);
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
export async function confirmSource(fileHash: string, sourceUrl: string): Promise<string> {
    console.log("API: confirmSource", { fileHash, sourceUrl });

    // Safety check: has the user already confirmed this?
    const currentSources = get(fileSources)[fileHash]?.data || [];
    const userTokenId = get(reputation_proof)?.token_id;

    if (userTokenId && currentSources.some(s => s.sourceUrl === sourceUrl && s.ownerTokenId === userTokenId)) {
        throw new Error("You have already confirmed this source.");
    }

    return await addFileSource(fileHash, sourceUrl);
}

/**
 * Mark a FILE_SOURCE box as invalid.
 * Creates an INVALID_FILE_SOURCE box with R5=sourceBoxId.
 */
export async function markInvalidSource(sourceBoxId: string): Promise<string> {
    console.log("API: markInvalidSource", { sourceBoxId });

    const inputProofBox = await getOrCreateProfileBox();
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
export async function markUnavailableSource(sourceUrl: string): Promise<string> {
    console.log("API: markUnavailableSource", sourceUrl);

    const inputProofBox = await getOrCreateProfileBox();
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
        inputProofBox
    );

    if (!tx) throw new Error("Unavailable source transaction failed.");
    console.log("Unavailable source transaction sent, ID:", tx);

    return tx;
}

// updateSourceVote removed as it's no longer used with the new system

/**
 * Trust or distrust a profile.
 * Creates a PROFILE_OPINION box with R5=profileTokenId, R8=isTrusted.
 */
export async function trustProfile(profileTokenId: string, isTrusted: boolean): Promise<string> {
    console.log("API: trustProfile", { profileTokenId, isTrusted });

    const inputProofBox = await getOrCreateProfileBox();
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
        inputProofBox
    );

    if (!tx) throw new Error("Profile opinion transaction failed.");
    console.log("Profile opinion transaction sent, ID:", tx);

    return tx;
}

// --- STORE ACTIONS ---

/**
 * Load file sources by hash.
 */
export async function searchByHash(fileHash: string) {
    const currentFileSources = get(fileSources);

    if (isEntryValid(currentFileSources[fileHash])) {
        console.log(`Using cache for hash: ${fileHash}`);
        currentSearchHash.set(fileHash);
        return;
    }

    isLoading.set(true);
    error.set(null);
    currentSearchHash.set(fileHash);

    try {
        const sources = await fetchFileSourcesByHash(fileHash);

        fileSources.update(s => {
            s[fileHash] = { data: sources, timestamp: Date.now() };
            return s;
        });

        // Load invalidations and unavailabilities for each source
        const currentInvalidations = get(invalidFileSources);
        const currentUnavailabilities = get(unavailableSources);

        for (const source of sources) {
            // Fetch invalidations for this box
            if (!isEntryValid(currentInvalidations[source.id])) {
                const invalidations = await fetchInvalidFileSources(source.id);
                invalidFileSources.update(s => {
                    s[source.id] = { data: invalidations, timestamp: Date.now() };
                    return s;
                });
            }

            // Fetch unavailabilities for this URL
            if (!isEntryValid(currentUnavailabilities[source.sourceUrl])) {
                const unavailabilities = await fetchUnavailableSources(source.sourceUrl);
                unavailableSources.update(s => {
                    s[source.sourceUrl] = { data: unavailabilities, timestamp: Date.now() };
                    return s;
                });
            }
        }
    } catch (err: any) {
        error.set(err.message || "Error searching file sources.");
    } finally {
        isLoading.set(false);
    }
}

/**
 * Load all file sources for browsing.
 */
export async function loadAllSources() {
    const currentFileSources = get(fileSources);
    if (isEntryValid(currentFileSources["ALL"])) {
        console.log("Using cache for all sources");
        return;
    }

    isLoading.set(true);
    error.set(null);

    try {
        const sources = await fetchAllFileSources(50);
        fileSources.update(s => {
            s["ALL"] = { data: sources, timestamp: Date.now() };
            return s;
        });
    } catch (err: any) {
        error.set(err.message || "Error loading file sources.");
    } finally {
        isLoading.set(false);
    }
}

/**
 * Load profile opinions for a specific profile.
 */
export async function loadProfileOpinions(profileTokenId: string) {
    const currentProfileOpinions = get(profileOpinions);
    if (isEntryValid(currentProfileOpinions[profileTokenId])) {
        console.log(`Using cache for profile opinions: ${profileTokenId}`);
        return;
    }

    try {
        const opinions = await fetchProfileOpinions(profileTokenId);
        profileOpinions.update(s => {
            s[profileTokenId] = { data: opinions, timestamp: Date.now() };
            return s;
        });

        const opinionsGiven = await fetchProfileOpinionsByAuthor(profileTokenId);
        profileOpinionsGiven.update(s => {
            s[profileTokenId] = { data: opinionsGiven, timestamp: Date.now() };
            return s;
        });
    } catch (err: any) {
        console.error("Error loading profile opinions:", err);
    }
}

/**
 * Load file sources for a specific profile.
 */
export async function loadSourcesByProfile(profileTokenId: string) {
    const currentFileSources = get(fileSources);
    const currentInvalidations = get(profileInvalidations);
    const currentUnavailabilities = get(profileUnavailabilities);

    const sourcesValid = isEntryValid(currentFileSources[profileTokenId]);
    const invsValid = isEntryValid(currentInvalidations[profileTokenId]);
    const unavsValid = isEntryValid(currentUnavailabilities[profileTokenId]);

    if (sourcesValid && invsValid && unavsValid) {
        console.log(`Using cache for profile sources and opinions: ${profileTokenId}`);
        // Also load profile opinions (trust/distrust)
        await loadProfileOpinions(profileTokenId);
        return;
    }

    isLoading.set(true);
    error.set(null);

    try {
        // Fetch sources
        const sources = await fetchFileSourcesByProfile(profileTokenId, 50);
        fileSources.update(s => {
            s[profileTokenId] = { data: sources, timestamp: Date.now() };
            return s;
        });

        // Fetch invalidations created by this profile
        const invalidations = await fetchInvalidFileSourcesByProfile(profileTokenId, 50);
        profileInvalidations.update(s => {
            s[profileTokenId] = { data: invalidations, timestamp: Date.now() };
            return s;
        });

        // Fetch unavailabilities created by this profile
        const unavailabilities = await fetchUnavailableSourcesByProfile(profileTokenId, 50);
        profileUnavailabilities.update(s => {
            s[profileTokenId] = { data: unavailabilities, timestamp: Date.now() };
            return s;
        });

        // Also load profile opinions (trust/distrust)
        await loadProfileOpinions(profileTokenId);

    } catch (err: any) {
        error.set(err.message || "Error loading profile file sources.");
    } finally {
        isLoading.set(false);
    }
}
