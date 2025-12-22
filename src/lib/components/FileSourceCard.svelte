<script lang="ts">
    import {
        type FileSource,
        type InvalidFileSource,
        type UnavailableSource,
    } from "$lib/ergo/sourceObject";
    import {
        confirmSource,
        markInvalidSource,
        markUnavailableSource,
        updateFileSource,
    } from "$lib/ergo/sourceStore";
    import { type ReputationProof } from "$lib/ergo/object";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import {
        ThumbsUp,
        ThumbsDown,
        Copy,
        ExternalLink,
        Check,
        X,
        Pen,
        CloudOff,
    } from "lucide-svelte";
    import * as jdenticon from "jdenticon";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    export let source: FileSource;
    export let confirmations: FileSource[] = [];
    export let invalidations: InvalidFileSource[] = [];
    export let unavailabilities: UnavailableSource[] = [];

    // New props to replace stores
    export let profile: ReputationProof | null = null;
    export let explorerUri: string;
    export let webExplorerUriTx: string;
    export let webExplorerUriTkn: string;

    // Derived from profile
    $: userProfileTokenId = profile?.token_id || null;

    let isVoting = false;
    let voteError: string | null = null;

    $: confirmationScore = confirmations.reduce(
        (sum, op) => sum + op.reputationAmount,
        0,
    );
    $: invalidationScore = invalidations.reduce(
        (sum, op) => sum + op.reputationAmount,
        0,
    );
    $: unavailabilityScore = unavailabilities.reduce(
        (sum, op) => sum + op.reputationAmount,
        0,
    );

    $: userHasConfirmed =
        source.ownerTokenId === userProfileTokenId ||
        confirmations.some((op) => op.ownerTokenId === userProfileTokenId);
    $: userHasInvalidated = invalidations.some(
        (op) => op.authorTokenId === userProfileTokenId,
    );
    $: userHasMarkedUnavailable = unavailabilities.some(
        (op) => op.authorTokenId === userProfileTokenId,
    );

    let isEditingSource = false;
    let newSourceUrl = source.sourceUrl;
    let isUpdatingSource = false;

    function getAvatarSvg(tokenId: string, size = 40): string {
        return jdenticon.toSvg(tokenId, size);
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }

    async function handleConfirm() {
        if (!profile) return;
        isVoting = true;
        voteError = null;
        try {
            await confirmSource(
                source.fileHash,
                source.sourceUrl,
                profile,
                confirmations, // Pass current confirmations as "currentSources" for check?
                // Wait, confirmSource expects "currentSources: FileSource[]".
                // confirmations IS FileSource[]. Correct.
                explorerUri,
            );
            console.log("Source confirmed");
        } catch (err: any) {
            console.error("Error confirming:", err);
            voteError = err?.message || "Failed to confirm";
        } finally {
            isVoting = false;
        }
    }

    async function handleInvalid() {
        if (!profile) return;
        isVoting = true;
        voteError = null;
        try {
            await markInvalidSource(source.id, profile, explorerUri);
            console.log("Source marked as invalid");
        } catch (err: any) {
            console.error("Error marking invalid:", err);
            voteError = err?.message || "Failed to mark invalid";
        } finally {
            isVoting = false;
        }
    }

    async function handleUnavailable() {
        if (!profile) return;
        isVoting = true;
        voteError = null;
        try {
            await markUnavailableSource(source.sourceUrl, profile, explorerUri);
            console.log("Source marked as unavailable");
        } catch (err: any) {
            console.error("Error marking unavailable:", err);
            voteError = err?.message || "Failed to mark unavailable";
        } finally {
            isVoting = false;
        }
    }

    async function handleUpdateSource() {
        if (!profile || !newSourceUrl.trim()) return;

        isUpdatingSource = true;
        voteError = null;
        try {
            await updateFileSource(
                source.id,
                source.fileHash,
                newSourceUrl.trim(),
                profile,
                explorerUri,
            );
            console.log("Source updated");
            isEditingSource = false;
        } catch (err: any) {
            console.error("Error updating source:", err);
            voteError = err?.message || "Failed to update source";
        } finally {
            isUpdatingSource = false;
        }
    }

    function getScoreColor(score: number): string {
        if (score > 0) return "text-green-500";
        if (score < 0) return "text-red-500";
        return "text-muted-foreground";
    }

    function getStatusBadge(): { text: string; color: string } {
        if (invalidationScore > confirmationScore) {
            return { text: "Invalid", color: "bg-red-500/20 text-red-400" };
        }
        if (unavailabilityScore > 0) {
            return {
                text: "Unavailable",
                color: "bg-orange-500/20 text-orange-400",
            };
        }
        if (confirmationScore > 0) {
            return {
                text: "Confirmed",
                color: "bg-green-500/20 text-green-400",
            };
        }
        return { text: "Unverified", color: "bg-gray-500/20 text-gray-400" };
    }

    $: statusBadge = getStatusBadge();

    function navigateToProfile(tokenId: string) {
        const url = new URL($page.url);
        url.searchParams.set("profile", tokenId);
        url.searchParams.set("tab", "profile");
        url.searchParams.delete("search");
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function navigateToSearch(fileHash: string) {
        const url = new URL($page.url);
        url.searchParams.set("search", fileHash);
        url.searchParams.set("tab", "search");
        url.searchParams.delete("profile");
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }
</script>

<div
    class="bg-card p-4 rounded-lg border hover:border-primary/50 transition-colors"
>
    <div class="flex items-start gap-4">
        <!-- Owner Avatar -->
        <button
            class="flex-shrink-0 hover:opacity-80 transition-opacity"
            on:click={() => navigateToProfile(source.ownerTokenId)}
            title="View profile sources"
        >
            {@html getAvatarSvg(source.ownerTokenId, 48)}
        </button>

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
            <!-- Header: Owner + Status -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
                <button
                    on:click={() => navigateToProfile(source.ownerTokenId)}
                    class="text-sm font-medium text-primary hover:underline"
                    title="View profile sources"
                >
                    @{source.ownerTokenId.slice(0, 8)}...
                </button>
                <a
                    href={`${webExplorerUriTkn}${source.ownerTokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-muted-foreground hover:text-primary"
                    title="View on Explorer"
                >
                    <ExternalLink class="w-3 h-3" />
                </a>
                <span class="text-xs px-2 py-0.5 rounded {statusBadge.color}">
                    {statusBadge.text}
                </span>
                <span class="text-xs text-muted-foreground">
                    {new Date(source.timestamp).toLocaleString()}
                </span>
            </div>

            <!-- File Hash -->
            <div class="mb-3">
                <div class="text-xs text-muted-foreground mb-1">File Hash:</div>
                <div class="flex items-center gap-2">
                    <button
                        on:click={() => navigateToSearch(source.fileHash)}
                        class="text-sm bg-secondary px-2 py-1 rounded font-mono break-all hover:bg-secondary/80 text-left"
                        title="Search for this hash"
                    >
                        {source.fileHash}
                    </button>
                    <button
                        on:click={() => copyToClipboard(source.fileHash)}
                        class="p-1 hover:bg-secondary rounded"
                        title="Copy hash"
                    >
                        <Copy class="w-3 h-3" />
                    </button>
                </div>
            </div>

            <!-- Source URL -->
            <div class="mb-3">
                <div class="text-xs text-muted-foreground mb-1">
                    Download Source:
                </div>
                <div class="flex items-center gap-2">
                    {#if isEditingSource}
                        <div class="flex-1 flex gap-2">
                            <Input
                                bind:value={newSourceUrl}
                                placeholder="New source URL"
                                class="h-8 text-sm font-mono"
                                disabled={isUpdatingSource}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                class="h-8 w-8 p-0 text-green-500"
                                on:click={handleUpdateSource}
                                disabled={isUpdatingSource ||
                                    !newSourceUrl.trim() ||
                                    newSourceUrl === source.sourceUrl}
                            >
                                <Check class="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                class="h-8 w-8 p-0 text-red-500"
                                on:click={() => {
                                    isEditingSource = false;
                                    newSourceUrl = source.sourceUrl;
                                }}
                                disabled={isUpdatingSource}
                            >
                                <X class="w-4 h-4" />
                            </Button>
                        </div>
                    {:else}
                        <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-sm text-blue-400 hover:underline break-all font-mono flex items-center gap-1"
                        >
                            {source.sourceUrl}
                            <ExternalLink class="w-3 h-3 flex-shrink-0" />
                        </a>
                        {#if source.ownerTokenId === userProfileTokenId}
                            <button
                                on:click={() => (isEditingSource = true)}
                                class="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                                title="Edit source URL"
                            >
                                <Pen class="w-3 h-3" />
                            </button>
                        {/if}
                    {/if}
                </div>
            </div>

            <!-- Voting Section -->
            <div class="flex items-center gap-4 flex-wrap">
                <!-- Vote Buttons -->
                {#if userProfileTokenId}
                    <div class="flex gap-2 items-center">
                        <Button
                            variant={userHasConfirmed ? "default" : "outline"}
                            size="sm"
                            on:click={handleConfirm}
                            disabled={isVoting || userHasConfirmed}
                            class="text-xs h-8"
                            title="Confirm this source provides the file"
                        >
                            <ThumbsUp class="w-3 h-3 mr-1" />
                            {userHasConfirmed ? "Confirmed" : "Confirm"}
                        </Button>
                        <Button
                            variant={userHasInvalidated ? "default" : "outline"}
                            size="sm"
                            on:click={handleInvalid}
                            disabled={isVoting || userHasInvalidated}
                            class="text-xs h-8"
                            title="Mark this source as fake or incorrect"
                        >
                            <ThumbsDown class="w-3 h-3 mr-1" />
                            {userHasInvalidated ? "Invalidated" : "Invalid"}
                        </Button>
                        <Button
                            variant={userHasMarkedUnavailable
                                ? "default"
                                : "outline"}
                            size="sm"
                            on:click={handleUnavailable}
                            disabled={isVoting || userHasMarkedUnavailable}
                            class="text-xs h-8"
                            title="Mark this URL as broken or unavailable"
                        >
                            <CloudOff class="w-3 h-3 mr-1" />
                            {userHasMarkedUnavailable
                                ? "Unavailable"
                                : "Unavailable"}
                        </Button>
                    </div>
                {/if}

                <!-- Score Display -->
                <div class="flex items-center gap-3 text-xs">
                    <div
                        class="flex items-center gap-1"
                        title="File Confirmations (Global)"
                    >
                        <ThumbsUp class="w-3 h-3 text-green-500" />
                        <span>{confirmations.length || 1}</span>
                    </div>
                    <div
                        class="flex items-center gap-1"
                        title="Source Invalidations (Thumbs Down)"
                    >
                        <ThumbsDown class="w-3 h-3 text-red-500" />
                        <span>{invalidations.length}</span>
                    </div>
                    <div
                        class="flex items-center gap-1"
                        title="Source Offline (Unavailable)"
                    >
                        <CloudOff class="w-3 h-3 text-orange-500" />
                        <span>{unavailabilities.length}</span>
                    </div>
                </div>

                <!-- Transaction Link -->
                <a
                    href={`${webExplorerUriTx}${source.transactionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-muted-foreground hover:text-foreground ml-auto"
                >
                    #{source.id.slice(0, 8)}...
                </a>
            </div>

            <!-- Vote Error -->
            {#if voteError}
                <div class="mt-2 text-xs text-red-400">
                    {voteError}
                </div>
            {/if}
        </div>
    </div>
</div>
