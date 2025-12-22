<script lang="ts">
    import { type DownloadSourceGroup } from "$lib/ergo/sourceObject";
    import {
        confirmSource,
        markInvalidSource,
        markUnavailableSource,
    } from "$lib/ergo/sourceStore";
    import { Button } from "$lib/components/ui/button/index.js";
    import {
        ThumbsUp,
        ThumbsDown,
        ExternalLink,
        CloudOff,
    } from "lucide-svelte";
    import * as jdenticon from "jdenticon";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    export let group: DownloadSourceGroup;
    export let userProfileTokenId: string | null = null;
    export let fileHash: string;

    let isVoting = false;
    let voteError: string | null = null;

    $: userHasConfirmed = group.owners.includes(userProfileTokenId || "");
    $: userHasInvalidated = group.invalidations.some(
        (op) => op.authorTokenId === userProfileTokenId,
    );
    $: userHasMarkedUnavailable = group.unavailabilities.some(
        (op) => op.authorTokenId === userProfileTokenId,
    );

    function getAvatarSvg(tokenId: string, size = 32): string {
        return jdenticon.toSvg(tokenId, size);
    }

    async function handleConfirm() {
        if (!userProfileTokenId) return;
        isVoting = true;
        voteError = null;
        try {
            await confirmSource(fileHash, group.sourceUrl);
        } catch (err: any) {
            voteError = err?.message || "Failed to confirm";
        } finally {
            isVoting = false;
        }
    }

    async function handleInvalid() {
        if (!userProfileTokenId) return;
        isVoting = true;
        voteError = null;
        try {
            // Mark the first source in the group as invalid (or all? User said "at download source level")
            // Usually invalidating one is enough to flag the URL if we aggregate.
            // But let's invalidate the first one for now.
            await markInvalidSource(group.sources[0].id);
        } catch (err: any) {
            voteError = err?.message || "Failed to mark invalid";
        } finally {
            isVoting = false;
        }
    }

    async function handleUnavailable() {
        if (!userProfileTokenId) return;
        isVoting = true;
        voteError = null;
        try {
            await markUnavailableSource(group.sourceUrl);
        } catch (err: any) {
            voteError = err?.message || "Failed to mark unavailable";
        } finally {
            isVoting = false;
        }
    }

    function navigateToProfile(tokenId: string) {
        const url = new URL($page.url);
        url.searchParams.set("profile", tokenId);
        url.searchParams.set("tab", "profile");
        url.searchParams.delete("search");
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }
</script>

<div class="py-6 border-b last:border-0">
    <div class="flex flex-col gap-4">
        <!-- Source URL -->
        <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
                <div class="text-xs text-muted-foreground mb-1">
                    Download Source:
                </div>
                <a
                    href={group.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-blue-400 hover:underline break-all font-mono flex items-center gap-1"
                >
                    {group.sourceUrl}
                    <ExternalLink class="w-3 h-3 flex-shrink-0" />
                </a>
            </div>

            <!-- Global Status Badge (Optional, could be added here) -->
        </div>

        <!-- Contributing Profiles -->
        <div>
            <div class="text-xs text-muted-foreground mb-2">
                Provided by {group.owners.length} profile{group.owners.length >
                1
                    ? "s"
                    : ""}:
            </div>
            <div class="flex flex-wrap gap-2">
                {#each group.owners as ownerTokenId}
                    <button
                        on:click={() => navigateToProfile(ownerTokenId)}
                        class="hover:opacity-80 transition-opacity"
                        title={`View profile @${ownerTokenId.slice(0, 8)}...`}
                    >
                        {@html getAvatarSvg(ownerTokenId)}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Actions and Metrics -->
        <div class="flex items-center gap-4 flex-wrap pt-2 border-t">
            {#if userProfileTokenId}
                <div class="flex gap-2 items-center">
                    <Button
                        variant={userHasConfirmed ? "default" : "outline"}
                        size="sm"
                        on:click={handleConfirm}
                        disabled={isVoting || userHasConfirmed}
                        class="text-xs h-8"
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
                    >
                        <CloudOff class="w-3 h-3 mr-1" />
                        {userHasMarkedUnavailable
                            ? "Unavailable"
                            : "Unavailable"}
                    </Button>
                </div>
            {/if}

            <div class="flex items-center gap-3 text-xs ml-auto">
                <div
                    class="flex items-center gap-1"
                    title="Source Invalidations (Thumbs Down)"
                >
                    <ThumbsDown class="w-3 h-3 text-red-500" />
                    <span>{group.invalidations.length}</span>
                </div>
                <div
                    class="flex items-center gap-1"
                    title="Source Offline (Unavailable)"
                >
                    <CloudOff class="w-3 h-3 text-orange-500" />
                    <span>{group.unavailabilities.length}</span>
                </div>
            </div>
        </div>

        {#if voteError}
            <div class="text-xs text-red-400">
                {voteError}
            </div>
        {/if}
    </div>
</div>
