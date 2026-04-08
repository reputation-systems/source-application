/**
 * Data models for Source Application
 *
 * This module defines the core interfaces for the decentralized File Discovery
 * and Verification system built on Ergo blockchain.
 */
// --- HELPER FUNCTIONS ---
/**
 * Get the primary URL from a FileSource.
 * Returns the first source entry's URL, or an empty string if no sources.
 */
export function getPrimaryUrl(source) {
    return source.source?.urlLink || '';
}
/**
 * Get all URLs from a FileSource.
 * With single source entry, returns an array with one URL.
 */
export function getAllUrls(source) {
    return source.source?.urlLink ? [source.source.urlLink] : [];
}
/**
 * Group file sources by their download URLs.
 * A FileSource can contain multiple URLs; it will appear in each group.
 */
export function groupByDownloadSource(sources, invalidationsMap, unavailabilitiesMap) {
    const groups = {};
    for (const source of sources) {
        const url = source.source?.urlLink;
        if (!url)
            continue;
        if (!groups[url]) {
            groups[url] = {
                sourceUrl: url,
                sources: [],
                owners: [],
                invalidations: [],
                unavailabilities: unavailabilitiesMap[url]?.data || []
            };
        }
        // Avoid duplicating the same source in the same group
        if (!groups[url].sources.some(s => s.id === source.id)) {
            groups[url].sources.push(source);
        }
        if (!groups[url].owners.includes(source.ownerTokenId)) {
            groups[url].owners.push(source.ownerTokenId);
        }
        // Add invalidations for this specific box
        const boxInvalidations = invalidationsMap[source.id]?.data || [];
        groups[url].invalidations.push(...boxInvalidations);
    }
    return Object.values(groups).sort((a, b) => b.sources.length - a.sources.length);
}
/**
 * Group file sources by the profile that submitted them.
 */
export function groupByProfile(sources) {
    const groups = {};
    for (const source of sources) {
        if (!groups[source.ownerTokenId]) {
            groups[source.ownerTokenId] = {
                profileTokenId: source.ownerTokenId,
                sources: []
            };
        }
        groups[source.ownerTokenId].sources.push(source);
    }
    return Object.values(groups).sort((a, b) => b.sources.length - a.sources.length);
}
/**
 * Calculate the trust score for a profile based on PROFILE_OPINION boxes.
 */
export function calculateProfileTrust(profileTokenId, opinions) {
    const trust = opinions
        .filter(op => op.isTrusted)
        .reduce((sum, op) => sum + op.reputationAmount, 0);
    const distrust = opinions
        .filter(op => !op.isTrusted)
        .reduce((sum, op) => sum + op.reputationAmount, 0);
    return trust - distrust;
}
/**
 * Aggregate opinions into score data for a file source.
 */
export function aggregateSourceScore(source, allSources, invalidations, unavailabilities, profileOpinions = []) {
    // Confirmations are other sources with same hash and same URL
    const sourceUrl = source.source?.urlLink || '';
    const confirmations = allSources.filter(s => s.id !== source.id &&
        s.fileHash === source.fileHash &&
        s.source?.urlLink === sourceUrl);
    // Invalidations for this specific box
    const filteredInvalidations = invalidations.filter(inv => inv.targetBoxId === source.id);
    // Unavailabilities for the URL in this source
    const filteredUnavailabilities = unavailabilities.filter(un => un.sourceUrl === sourceUrl);
    const confirmationScore = confirmations.reduce((sum, s) => sum + s.reputationAmount, 0);
    const invalidationScore = filteredInvalidations.reduce((sum, inv) => sum + inv.reputationAmount, 0);
    const unavailabilityScore = filteredUnavailabilities.reduce((sum, un) => sum + un.reputationAmount, 0);
    const ownerTrustScore = calculateProfileTrust(source.ownerTokenId, profileOpinions);
    return {
        ...source,
        confirmations,
        invalidations: filteredInvalidations,
        unavailabilities: filteredUnavailabilities,
        confirmationScore,
        invalidationScore,
        unavailabilityScore,
        ownerTrustScore
    };
}
// --- SERIALIZATION HELPERS ---
/**
 * Serialize source entries to a JSON string for R9 content.
 * The reputation-system library encodes this as Coll[Byte] (UTF-8 bytes).
 *
 * Format: Coll[Coll[Byte]] — a JSON array containing one tuple (array):
 * [hash_function_id, content_format, content_hash, raw_format, url_link, is_chunked]
 *
 * Serialization format: Coll[Coll[Byte]]
 * The output represents a Coll[Coll[Byte]] structure — an array containing
 * one tuple (inner Coll[Byte]) with the source entry fields:
 *   [[hashFunctionId, contentFormat, contentHash, rawFormat, urlLink, isChunked]]
 *
 * The reputation-system library encodes this JSON string as Coll[Byte] for R9.
 * Since encoding operates on the raw UTF-8 bytes of the JSON string (not on
 * individual tuple elements), mixed types (string + boolean) within the tuple
 * are fine — JSON.parse restores original types on deserialization.
 */
export function serializeSourceEntry(entry) {
    // Coll[Coll[Byte]]: outer array = Coll, inner tuple = Coll[Byte] elements
    const tuple = [
        entry.hashFunctionId,
        entry.contentFormat,
        entry.contentHash,
        entry.rawFormat,
        entry.urlLink,
        entry.isChunked ?? false
    ];
    return JSON.stringify([tuple]); // Coll[Coll[Byte]] serialized as JSON string
}
/**
 * Deserialize source entries from R9 content string.
 *
 * Supports three formats (tried in order):
 * 1. Coll[Coll[Byte]] tuple format: [[hashFnId, contentFmt, contentHash, rawFmt, urlLink, isChunked]]
 * 2. Legacy JSON object format: [{ hashFunctionId, contentFormat, ... }]
 * 3. Legacy plain URL string
 *
 * Note: tuple[5] (isChunked) is a boolean while other elements are strings.
 * This is fine because the JSON string is what gets encoded as Coll[Byte],
 * and JSON.parse restores the original types.
 */
export function deserializeSourceEntry(content) {
    const empty = {
        hashFunctionId: '',
        contentFormat: '',
        contentHash: '',
        rawFormat: '',
        urlLink: ''
    };
    if (!content || content.trim() === '')
        return empty;
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const tuple = parsed[0];
            // Format 1: Coll[Coll[Byte]] tuple array
            // [[hashFnId, contentFmt, contentHash, rawFmt, urlLink, isChunked?]]
            if (Array.isArray(tuple) && tuple.length >= 5) {
                return {
                    hashFunctionId: tuple[0] || '',
                    contentFormat: tuple[1] || '',
                    contentHash: tuple[2] || '',
                    rawFormat: tuple[3] || '',
                    urlLink: tuple[4] || '',
                    isChunked: tuple[5] === true
                };
            }
            // Format 2: Legacy JSON object format
            // [{ hashFunctionId, contentFormat, contentHash, rawFormat, urlLink, isChunked }]
            if (typeof tuple === 'object' && tuple !== null && !Array.isArray(tuple)) {
                return {
                    hashFunctionId: tuple.hashFunctionId || '',
                    contentFormat: tuple.contentFormat || tuple.contentFormatNftId || '',
                    contentHash: tuple.contentHash || '',
                    rawFormat: tuple.rawFormat || tuple.rawFormatNftId || '',
                    urlLink: tuple.urlLink || '',
                    isChunked: tuple.isChunked === true
                };
            }
        }
    }
    catch {
        // Not JSON — treat as legacy plain URL string
    }
    // Format 3: Legacy plain URL string
    return {
        hashFunctionId: '',
        contentFormat: '',
        contentHash: '',
        rawFormat: '',
        urlLink: content,
        isChunked: false
    };
}
