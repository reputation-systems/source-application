/**
 * Data models for Source Application
 *
 * This module defines the core interfaces for the decentralized File Discovery
 * and Verification system built on Ergo blockchain.
 */
// --- HELPER FUNCTIONS ---
/**
 * Group file sources by their download URL.
 */
export function groupByDownloadSource(sources, invalidationsMap, unavailabilitiesMap) {
    const groups = {};
    for (const source of sources) {
        if (!groups[source.sourceUrl]) {
            groups[source.sourceUrl] = {
                sourceUrl: source.sourceUrl,
                sources: [],
                owners: [],
                invalidations: [],
                unavailabilities: unavailabilitiesMap[source.sourceUrl]?.data || []
            };
        }
        groups[source.sourceUrl].sources.push(source);
        if (!groups[source.sourceUrl].owners.includes(source.ownerTokenId)) {
            groups[source.sourceUrl].owners.push(source.ownerTokenId);
        }
        // Add invalidations for this specific box
        const boxInvalidations = invalidationsMap[source.id]?.data || [];
        groups[source.sourceUrl].invalidations.push(...boxInvalidations);
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
    // Confirmations are other sources with same hash and URL
    const confirmations = allSources.filter(s => s.id !== source.id &&
        s.fileHash === source.fileHash &&
        s.sourceUrl === source.sourceUrl);
    // Invalidations for this specific box
    const filteredInvalidations = invalidations.filter(inv => inv.targetBoxId === source.id);
    // Unavailabilities for this specific URL
    const filteredUnavailabilities = unavailabilities.filter(un => un.sourceUrl === source.sourceUrl);
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
