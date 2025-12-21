import { get } from 'svelte/store';
import { type FileSource, type SourceOpinion, type ProfileOpinion } from './sourceObject';
import { hexToBytes, hexToUtf8, serializedToRendered } from './utils';
import {
    FILE_SOURCE_TYPE_NFT_ID,
    SOURCE_OPINION_TYPE_NFT_ID,
    PROFILE_OPINION_TYPE_NFT_ID,
    explorer_uri
} from './envs';
import { ergo_tree_hash } from './contract';
import { SByte, SColl } from '@fleet-sdk/core';
import DOMPurify from "dompurify";


const LIMIT_PER_PAGE = 100;

/**
 * Gets the timestamp of a block given its block ID.
 */
export async function getTimestampFromBlockId(blockId: string): Promise<number> {
    const url = `${get(explorer_uri)}/api/v1/blocks/${blockId}`;

    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const timestamp = json?.block?.header?.timestamp;
        if (typeof timestamp !== "number") {
            console.warn(`No timestamp found for block ${blockId}`);
            return 0;
        }

        return timestamp < 1e11 ? timestamp * 1000 : timestamp;
    } catch (error) {
        console.error(`Error fetching timestamp for block ${blockId}:`, error);
        return 0;
    }
}

/**
 * Generic search function for boxes with specific R4 and R5 values
 */
async function searchBoxes(
    r4TypeNftId: string,
    r5Value: string
): Promise<ApiBox[]> {
    const boxes: ApiBox[] = [];

    const searchBody = {
        registers: {
            "R4": serializedToRendered(SColl(SByte, hexToBytes(r4TypeNftId) ?? "").toHex()),
            "R5": serializedToRendered(SColl(SByte, hexToBytes(r5Value) ?? "").toHex())
        }
    };

    try {
        let offset = 0;
        let moreDataAvailable = true;

        while (moreDataAvailable) {
            const url = `${get(explorer_uri)}/api/v1/boxes/unspent/search?offset=${offset}&limit=${LIMIT_PER_PAGE}`;

            const finalBody = {
                "ergoTreeTemplateHash": ergo_tree_hash,
                "registers": searchBody.registers,
                "assets": []
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalBody)
            });

            if (!response.ok) {
                console.error(`Error searching boxes: ${response.statusText}`);
                moreDataAvailable = false;
                continue;
            }

            const jsonData = await response.json();
            if (!jsonData.items || jsonData.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            boxes.push(...jsonData.items);
            offset += LIMIT_PER_PAGE;
        }

        return boxes;
    } catch (error) {
        console.error('Error while searching boxes:', error);
        return [];
    }
}

/**
 * Fetch all FILE_SOURCE boxes for a specific file hash.
 * Returns all sources (URLs) where this file can be found.
 */
export async function fetchFileSourcesByHash(fileHash: string): Promise<FileSource[]> {
    console.log("Fetching file sources for hash:", fileHash);
    const boxes = await searchBoxes(FILE_SOURCE_TYPE_NFT_ID, fileHash);

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
            timestamp: await getTimestampFromBlockId(box.blockId),
            isLocked: false,
            transactionId: box.transactionId
        };

        sources.push(source);
    }

    sources.sort((a, b) => b.timestamp - a.timestamp);
    return sources;
}

/**
 * Fetch all SOURCE_OPINION boxes for a specific source box.
 * Returns all opinions (votes) on this specific source.
 */
export async function fetchSourceOpinions(sourceBoxId: string): Promise<SourceOpinion[]> {
    console.log("Fetching opinions for source:", sourceBoxId);
    const boxes = await searchBoxes(SOURCE_OPINION_TYPE_NFT_ID, sourceBoxId);

    const opinions: SourceOpinion[] = [];

    for (const box of boxes) {
        if (!box.assets?.length) continue;
        if (box.additionalRegisters.R6?.renderedValue === "false") continue;

        const opinion: SourceOpinion = {
            id: box.boxId,
            targetBoxId: sourceBoxId,
            isPositive: box.additionalRegisters.R8?.renderedValue === 'true',
            authorTokenId: box.assets[0].tokenId,
            reputationAmount: Number(box.assets[0].amount),
            timestamp: await getTimestampFromBlockId(box.blockId),
            transactionId: box.transactionId
        };

        opinions.push(opinion);
    }

    return opinions;
}

/**
 * Fetch all PROFILE_OPINION boxes targeting a specific profile.
 * Returns all trust/distrust opinions for this profile.
 */
export async function fetchProfileOpinions(profileTokenId: string): Promise<ProfileOpinion[]> {
    console.log("Fetching profile opinions for:", profileTokenId);
    const boxes = await searchBoxes(PROFILE_OPINION_TYPE_NFT_ID, profileTokenId);

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
            timestamp: await getTimestampFromBlockId(box.blockId),
            transactionId: box.transactionId
        };

        opinions.push(opinion);
    }

    return opinions;
}

/**
 * Fetch all FILE_SOURCE boxes (for browsing).
 * Returns recent file sources sorted by timestamp.
 */
export async function fetchAllFileSources(limit: number = 50): Promise<FileSource[]> {
    console.log("Fetching all file sources...");

    try {
        const url = `${get(explorer_uri)}/api/v1/boxes/unspent/search?offset=0&limit=${limit}`;

        const searchBody = {
            registers: {
                "R4": serializedToRendered(SColl(SByte, hexToBytes(FILE_SOURCE_TYPE_NFT_ID) ?? "").toHex())
            }
        };

        const finalBody = {
            "ergoTreeTemplateHash": ergo_tree_hash,
            "registers": searchBody.registers,
            "assets": []
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody)
        });

        if (!response.ok) {
            console.error(`Error fetching all sources: ${response.statusText}`);
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
                timestamp: await getTimestampFromBlockId(box.blockId),
                isLocked: false,
                transactionId: box.transactionId
            };

            sources.push(source);
        }

        sources.sort((a, b) => b.timestamp - a.timestamp);
        return sources;

    } catch (error) {
        console.error('Error fetching all file sources:', error);
        return [];
    }
}
