import { hexToUtf8 } from './utils';
import { FILE_SOURCE_TYPE_NFT_ID, INVALID_FILE_SOURCE_TYPE_NFT_ID, UNAVAILABLE_SOURCE_TYPE_NFT_ID, PROFILE_OPINION_TYPE_NFT_ID } from './envs';
import DOMPurify from "dompurify";
import { getTimestampFromBlockId, searchBoxes } from 'reputation-system';
/**
 * Fetch all FILE_SOURCE boxes for a specific file hash.
 * Returns all sources (URLs) where this file can be found.
 */
export async function fetchFileSourcesByHash(fileHash, explorerUri) {
    console.log("Fetching file sources for hash:", fileHash);
    const generator = searchBoxes(explorerUri, undefined, FILE_SOURCE_TYPE_NFT_ID, fileHash, undefined, undefined, undefined, undefined, undefined, undefined);
    const boxes = await collectBoxes(generator);
    const sources = [];
    console.log(`Found ${boxes.length} boxes for file hash ${fileHash}`);
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        if (box.additionalRegisters.R6?.renderedValue !== "false")
            continue;
        if (!box.additionalRegisters.R9?.renderedValue)
            continue;
        let sourceUrl = "[Unreadable URL]";
        try {
            const rawValue = box.additionalRegisters.R9.renderedValue;
            if (rawValue) {
                sourceUrl = hexToUtf8(rawValue) ?? "[Empty URL]";
                // Sanitize URL for display
                sourceUrl = DOMPurify.sanitize(sourceUrl);
            }
        }
        catch (e) {
            console.warn(`Error decoding R9 for box ${box.boxId}`, e);
        }
        const source = {
            id: box.boxId,
            fileHash: fileHash,
            sourceUrl: sourceUrl,
            ownerTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            isLocked: false,
            transactionId: box.transactionId
        };
        sources.push(source);
    }
    sources.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`Returning ${sources.length} valid sources for file hash ${fileHash}`);
    return sources;
}
/**
 * Fetch all INVALID_FILE_SOURCE boxes for a specific source box.
 */
export async function fetchInvalidFileSources(sourceBoxId, explorerUri) {
    console.log("Fetching invalidations for source:", sourceBoxId);
    const generator = searchBoxes(explorerUri, undefined, INVALID_FILE_SOURCE_TYPE_NFT_ID, sourceBoxId, undefined, undefined, undefined, undefined, undefined, undefined);
    const boxes = await collectBoxes(generator);
    const invalidations = [];
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        const invalidation = {
            id: box.boxId,
            targetBoxId: sourceBoxId,
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            transactionId: box.transactionId
        };
        invalidations.push(invalidation);
    }
    return invalidations;
}
/**
 * Fetch all UNAVAILABLE_SOURCE boxes for a specific URL.
 */
export async function fetchUnavailableSources(sourceUrl, explorerUri) {
    console.log("Fetching unavailabilities for URL:", sourceUrl);
    const generator = searchBoxes(explorerUri, undefined, UNAVAILABLE_SOURCE_TYPE_NFT_ID, sourceUrl, undefined, undefined, undefined, undefined, undefined, undefined);
    const boxes = await collectBoxes(generator);
    const unavailabilities = [];
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        const unavailability = {
            id: box.boxId,
            sourceUrl: sourceUrl,
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            transactionId: box.transactionId
        };
        unavailabilities.push(unavailability);
    }
    return unavailabilities;
}
/**
 * Fetch all PROFILE_OPINION boxes targeting a specific profile.
 * Returns all trust/distrust opinions for this profile.
 */
export async function fetchProfileOpinions(profileTokenId, explorerUri) {
    console.log("Fetching profile opinions for:", profileTokenId);
    const generator = searchBoxes(explorerUri, undefined, PROFILE_OPINION_TYPE_NFT_ID, profileTokenId, undefined, undefined, undefined, undefined, undefined, undefined);
    const boxes = await collectBoxes(generator);
    const opinions = [];
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        if (box.additionalRegisters.R6?.renderedValue === "false")
            continue;
        const opinion = {
            id: box.boxId,
            targetProfileTokenId: profileTokenId,
            isTrusted: box.additionalRegisters.R8?.renderedValue === 'true',
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            transactionId: box.transactionId
        };
        opinions.push(opinion);
    }
    return opinions;
}
/**
 * Fetch all FILE_SOURCE boxes for a specific profile token ID.
 * Returns file sources created by this profile.
 */
export async function fetchFileSourcesByProfile(profileTokenId, limit = 50, explorerUri) {
    console.log("Fetching file sources for profile:", profileTokenId);
    const generator = searchBoxes(explorerUri, profileTokenId, FILE_SOURCE_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, limit, undefined);
    const boxes = await collectBoxes(generator);
    const sources = [];
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        if (box.additionalRegisters.R6?.renderedValue !== "false")
            continue;
        if (!box.additionalRegisters.R9?.renderedValue)
            continue;
        let fileHash = "[Unknown]";
        try {
            const rawR5 = box.additionalRegisters.R5?.renderedValue;
            if (rawR5) {
                fileHash = rawR5;
            }
        }
        catch (e) {
            console.warn(`Error decoding R5 for box ${box.boxId}`, e);
        }
        let sourceUrl = "[Unreadable URL]";
        try {
            const rawValue = box.additionalRegisters.R9.renderedValue;
            if (rawValue) {
                sourceUrl = hexToUtf8(rawValue) ?? "[Empty URL]";
                sourceUrl = DOMPurify.sanitize(sourceUrl);
            }
        }
        catch (e) {
            console.warn(`Error decoding R9 for box ${box.boxId}`, e);
        }
        const source = {
            id: box.boxId,
            fileHash: fileHash,
            sourceUrl: sourceUrl,
            ownerTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            isLocked: false,
            transactionId: box.transactionId
        };
        sources.push(source);
    }
    sources.sort((a, b) => b.timestamp - a.timestamp);
    return sources;
}
/**
 * Fetch all INVALID_FILE_SOURCE boxes created by a specific profile.
 */
export async function fetchInvalidFileSourcesByProfile(profileTokenId, limit = 50, explorerUri) {
    console.log("Fetching invalidations by profile:", profileTokenId);
    const generator = searchBoxes(explorerUri, profileTokenId, INVALID_FILE_SOURCE_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, limit, undefined);
    const boxes = await collectBoxes(generator);
    const invalidations = [];
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        invalidations.push({
            id: box.boxId,
            targetBoxId: hexToUtf8(box.additionalRegisters.R5?.renderedValue || "") || "",
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            transactionId: box.transactionId
        });
    }
    return invalidations;
}
/**
 * Fetch all UNAVAILABLE_SOURCE boxes created by a specific profile.
 */
export async function fetchUnavailableSourcesByProfile(profileTokenId, limit = 50, explorerUri) {
    console.log("Fetching unavailabilities by profile:", profileTokenId);
    const generator = searchBoxes(explorerUri, profileTokenId, UNAVAILABLE_SOURCE_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, limit, undefined);
    const boxes = await collectBoxes(generator);
    const unavailabilities = [];
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        unavailabilities.push({
            id: box.boxId,
            sourceUrl: hexToUtf8(box.additionalRegisters.R5?.renderedValue || "") || "",
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            transactionId: box.transactionId
        });
    }
    return unavailabilities;
}
/**
 * Fetch all PROFILE_OPINION boxes created by a specific profile.
 */
export async function fetchProfileOpinionsByAuthor(authorTokenId, explorerUri) {
    console.log("Fetching profile opinions by author:", authorTokenId);
    const generator = searchBoxes(explorerUri, authorTokenId, PROFILE_OPINION_TYPE_NFT_ID, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    const boxes = await collectBoxes(generator);
    const opinions = [];
    for (const box of boxes) {
        if (!box.assets?.length)
            continue;
        opinions.push({
            id: box.boxId,
            targetProfileTokenId: hexToUtf8(box.additionalRegisters.R5?.renderedValue || "") || "",
            isTrusted: box.additionalRegisters.R8?.renderedValue === 'true',
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
            transactionId: box.transactionId
        });
    }
    return opinions;
}
/**
 * Load file sources by hash.
 */
export async function searchByHash(fileHash, explorerUri) {
    const sources = await fetchFileSourcesByHash(fileHash, explorerUri);
    const invalidations = {};
    const unavailabilities = {};
    for (const source of sources) {
        // Fetch invalidations for this box
        const invs = await fetchInvalidFileSources(source.id, explorerUri);
        if (invs.length > 0)
            invalidations[source.id] = invs;
        // Fetch unavailabilities for this URL
        // Optimization: check if we already fetched for this URL
        if (!unavailabilities[source.sourceUrl]) {
            const unavs = await fetchUnavailableSources(explorerUri, source.sourceUrl);
            if (unavs.length > 0)
                unavailabilities[source.sourceUrl] = unavs;
        }
    }
    return { sources, invalidations, unavailabilities };
}
/**
 * Load all data related to a profile.
 */
export async function loadProfileData(profileTokenId, explorerUri) {
    const sources = await fetchFileSourcesByProfile(profileTokenId, 50, explorerUri);
    const invalidations = await fetchInvalidFileSourcesByProfile(profileTokenId, 50, explorerUri);
    const unavailabilities = await fetchUnavailableSourcesByProfile(profileTokenId, 50, explorerUri);
    const opinions = await fetchProfileOpinions(profileTokenId, explorerUri);
    const opinionsGiven = await fetchProfileOpinionsByAuthor(profileTokenId, explorerUri);
    return {
        sources,
        invalidations,
        unavailabilities,
        opinions,
        opinionsGiven
    };
}
async function collectBoxes(generator) {
    const boxes = [];
    for await (const batch of generator) {
        boxes.push(...batch);
    }
    return boxes;
}
