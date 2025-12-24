import { type FileSource, type ProfileOpinion } from './sourceObject';
import { hexToBytes, hexToUtf8, serializedToRendered } from './utils';
import {
    FILE_SOURCE_TYPE_NFT_ID,
    INVALID_FILE_SOURCE_TYPE_NFT_ID,
    UNAVAILABLE_SOURCE_TYPE_NFT_ID,
    PROFILE_OPINION_TYPE_NFT_ID
} from './envs';
import { ergo_tree_hash } from './contract';
import { SByte, SColl } from '@fleet-sdk/core';
import DOMPurify from "dompurify";
import { type ApiBox } from './object';
import { type InvalidFileSource, type UnavailableSource } from './sourceObject';
import { getTimestampFromBlockId, searchBoxes } from 'ergo-reputation-system';


/**
 * Fetch all FILE_SOURCE boxes for a specific file hash.
 * Returns all sources (URLs) where this file can be found.
 */
export async function fetchFileSourcesByHash(fileHash: string, explorerUri: string): Promise<FileSource[]> {
    console.log("Fetching file sources for hash:", fileHash);
    const boxes = await searchBoxes(FILE_SOURCE_TYPE_NFT_ID, fileHash, explorerUri);

    const sources: FileSource[] = [];

    for (const box of boxes) {
        if (!box.assets?.length) continue;
        if (box.additionalRegisters.R6?.renderedValue !== "false") continue;
        if (!box.additionalRegisters.R9?.renderedValue) continue;

        let sourceUrl = "[Unreadable URL]";
        try {
            const rawValue = box.additionalRegisters.R9.renderedValue;
            if (rawValue) {
                sourceUrl = hexToUtf8(rawValue) ?? "[Empty URL]";
                // Sanitize URL for display
                sourceUrl = DOMPurify.sanitize(sourceUrl);
            }
        } catch (e) {
            console.warn(`Error decoding R9 for box ${box.boxId}`, e);
        }

        const source: FileSource = {
            id: box.boxId,
            fileHash: fileHash,
            sourceUrl: sourceUrl,
            ownerTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
            isLocked: false,
            transactionId: box.transactionId
        };

        sources.push(source);
    }

    sources.sort((a, b) => b.timestamp - a.timestamp);
    return sources;
}

/**
 * Fetch all INVALID_FILE_SOURCE boxes for a specific source box.
 */
export async function fetchInvalidFileSources(sourceBoxId: string, explorerUri: string): Promise<InvalidFileSource[]> {
    console.log("Fetching invalidations for source:", sourceBoxId);
    const boxes = await searchBoxes(INVALID_FILE_SOURCE_TYPE_NFT_ID, sourceBoxId, explorerUri);

    const invalidations: InvalidFileSource[] = [];

    for (const box of boxes) {
        if (!box.assets?.length) continue;

        const invalidation: InvalidFileSource = {
            id: box.boxId,
            targetBoxId: sourceBoxId,
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
            transactionId: box.transactionId
        };

        invalidations.push(invalidation);
    }

    return invalidations;
}

/**
 * Fetch all UNAVAILABLE_SOURCE boxes for a specific URL.
 */
export async function fetchUnavailableSources(sourceUrl: string, explorerUri: string): Promise<UnavailableSource[]> {
    console.log("Fetching unavailabilities for URL:", sourceUrl);
    const boxes = await searchBoxes(UNAVAILABLE_SOURCE_TYPE_NFT_ID, sourceUrl, explorerUri);

    const unavailabilities: UnavailableSource[] = [];

    for (const box of boxes) {
        if (!box.assets?.length) continue;

        const unavailability: UnavailableSource = {
            id: box.boxId,
            sourceUrl: sourceUrl,
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
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
export async function fetchProfileOpinions(profileTokenId: string, explorerUri: string): Promise<ProfileOpinion[]> {
    console.log("Fetching profile opinions for:", profileTokenId);
    const boxes = await searchBoxes(PROFILE_OPINION_TYPE_NFT_ID, profileTokenId, explorerUri);

    const opinions: ProfileOpinion[] = [];

    for (const box of boxes) {
        if (!box.assets?.length) continue;
        if (box.additionalRegisters.R6?.renderedValue === "false") continue;

        const opinion: ProfileOpinion = {
            id: box.boxId,
            targetProfileTokenId: profileTokenId,
            isTrusted: box.additionalRegisters.R8?.renderedValue === 'true',
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
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
export async function fetchFileSourcesByProfile(profileTokenId: string, limit: number = 50, explorerUri: string): Promise<FileSource[]> {
    console.log("Fetching file sources for profile:", profileTokenId);

    try {
        const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=0&limit=${limit}`;

        const searchBody = {
            registers: {
                "R4": serializedToRendered(SColl(SByte, hexToBytes(FILE_SOURCE_TYPE_NFT_ID) ?? "").toHex())
            }
        };

        const finalBody = {
            "ergoTreeTemplateHash": ergo_tree_hash,
            "registers": searchBody.registers,
            "assets": [profileTokenId]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody)
        });

        if (!response.ok) {
            console.error(`Error fetching profile sources: ${response.statusText}`);
            return [];
        }

        const jsonData = await response.json();
        if (!jsonData.items || jsonData.items.length === 0) {
            return [];
        }

        const sources: FileSource[] = [];

        for (const box of jsonData.items as ApiBox[]) {
            if (!box.assets?.length) continue;
            if (box.additionalRegisters.R6?.renderedValue !== "false") continue;
            if (!box.additionalRegisters.R9?.renderedValue) continue;

            let fileHash = "[Unknown]";
            try {
                const rawR5 = box.additionalRegisters.R5?.renderedValue;
                if (rawR5) {
                    fileHash = rawR5;
                }
            } catch (e) {
                console.warn(`Error decoding R5 for box ${box.boxId}`, e);
            }

            let sourceUrl = "[Unreadable URL]";
            try {
                const rawValue = box.additionalRegisters.R9.renderedValue;
                if (rawValue) {
                    sourceUrl = hexToUtf8(rawValue) ?? "[Empty URL]";
                    sourceUrl = DOMPurify.sanitize(sourceUrl);
                }
            } catch (e) {
                console.warn(`Error decoding R9 for box ${box.boxId}`, e);
            }

            const source: FileSource = {
                id: box.boxId,
                fileHash: fileHash,
                sourceUrl: sourceUrl,
                ownerTokenId: box.assets[0].tokenId,
                reputationAmount: Number(box.assets[0].amount),
                timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
                isLocked: false,
                transactionId: box.transactionId
            };

            sources.push(source);
        }

        sources.sort((a, b) => b.timestamp - a.timestamp);
        return sources;

    } catch (error) {
        console.error('Error fetching profile file sources:', error);
        return [];
    }
}

/**
 * Fetch all INVALID_FILE_SOURCE boxes created by a specific profile.
 */
export async function fetchInvalidFileSourcesByProfile(profileTokenId: string, limit: number = 50, explorerUri: string): Promise<InvalidFileSource[]> {
    console.log("Fetching invalidations by profile:", profileTokenId);

    try {
        const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=0&limit=${limit}`;

        const searchBody = {
            registers: {
                "R4": serializedToRendered(SColl(SByte, hexToBytes(INVALID_FILE_SOURCE_TYPE_NFT_ID) ?? "").toHex())
            }
        };

        const finalBody = {
            "ergoTreeTemplateHash": ergo_tree_hash,
            "registers": searchBody.registers,
            "assets": [profileTokenId]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody)
        });

        if (!response.ok) return [];

        const jsonData = await response.json();
        if (!jsonData.items) return [];

        const invalidations: InvalidFileSource[] = [];
        for (const box of jsonData.items as ApiBox[]) {
            if (!box.assets?.length) continue;
            invalidations.push({
                id: box.boxId,
                targetBoxId: hexToUtf8(box.additionalRegisters.R5?.renderedValue || "") || "",
                authorTokenId: box.assets[0].tokenId,
                reputationAmount: Number(box.assets[0].amount),
                timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
                transactionId: box.transactionId
            });
        }
        return invalidations;
    } catch (error) {
        console.error('Error fetching profile invalidations:', error);
        return [];
    }
}

/**
 * Fetch all UNAVAILABLE_SOURCE boxes created by a specific profile.
 */
export async function fetchUnavailableSourcesByProfile(profileTokenId: string, limit: number = 50, explorerUri: string): Promise<UnavailableSource[]> {
    console.log("Fetching unavailabilities by profile:", profileTokenId);

    try {
        const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=0&limit=${limit}`;

        const searchBody = {
            registers: {
                "R4": serializedToRendered(SColl(SByte, hexToBytes(UNAVAILABLE_SOURCE_TYPE_NFT_ID) ?? "").toHex())
            }
        };

        const finalBody = {
            "ergoTreeTemplateHash": ergo_tree_hash,
            "registers": searchBody.registers,
            "assets": [profileTokenId]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody)
        });

        if (!response.ok) return [];

        const jsonData = await response.json();
        if (!jsonData.items) return [];

        const unavailabilities: UnavailableSource[] = [];
        for (const box of jsonData.items as ApiBox[]) {
            if (!box.assets?.length) continue;
            unavailabilities.push({
                id: box.boxId,
                sourceUrl: hexToUtf8(box.additionalRegisters.R5?.renderedValue || "") || "",
                authorTokenId: box.assets[0].tokenId,
                reputationAmount: Number(box.assets[0].amount),
                timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
                transactionId: box.transactionId
            });
        }
        return unavailabilities;
    } catch (error) {
        console.error('Error fetching profile unavailabilities:', error);
        return [];
    }
}

/**
 * Fetch all PROFILE_OPINION boxes created by a specific profile.
 */
export async function fetchProfileOpinionsByAuthor(authorTokenId: string, limit: number = 50, explorerUri: string): Promise<ProfileOpinion[]> {
    console.log("Fetching profile opinions by author:", authorTokenId);

    try {
        const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=0&limit=${limit}`;

        const searchBody = {
            registers: {
                "R4": serializedToRendered(SColl(SByte, hexToBytes(PROFILE_OPINION_TYPE_NFT_ID) ?? "").toHex())
            }
        };

        const finalBody = {
            "ergoTreeTemplateHash": ergo_tree_hash,
            "registers": searchBody.registers,
            "assets": [authorTokenId]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody)
        });

        if (!response.ok) return [];

        const jsonData = await response.json();
        if (!jsonData.items) return [];

        const opinions: ProfileOpinion[] = [];
        for (const box of jsonData.items as ApiBox[]) {
            if (!box.assets?.length) continue;
            opinions.push({
                id: box.boxId,
                targetProfileTokenId: hexToUtf8(box.additionalRegisters.R5?.renderedValue || "") || "",
                isTrusted: box.additionalRegisters.R8?.renderedValue === 'true',
                authorTokenId: box.assets[0].tokenId,
                reputationAmount: Number(box.assets[0].amount),
                timestamp: await getTimestampFromBlockId(box.blockId, explorerUri),
                transactionId: box.transactionId
            });
        }
        return opinions;
    } catch (error) {
        console.error('Error fetching profile opinions by author:', error);
        return [];
    }
}
