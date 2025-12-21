<script lang="ts">
    import {
        type FileSource,
        type SourceOpinion,
    } from "$lib/ergo/sourceObject";
    import { voteOnSource } from "$lib/ergo/sourceStore";
    import { Button } from "$lib/components/ui/button/index.js";
    import { ThumbsUp, ThumbsDown, Copy, ExternalLink } from "lucide-svelte";
    import * as jdenticon from "jdenticon";
    import { get } from "svelte/store";
    import { web_explorer_uri_tx, web_explorer_uri_tkn } from "$lib/ergo/envs";

    export let source: FileSource;
    export let opinions: SourceOpinion[] = [];
    export let userProfileTokenId: string | null = null;

    let isVoting = false;
    let voteError: string | null = null;

    $: positiveVotes = opinions.filter((op) => op.isPositive);
    $: negativeVotes = opinions.filter((op) => !op.isPositive);
    $: positiveScore = positiveVotes.reduce(
        (sum, op) => sum + op.reputationAmount,
        0,
    );
    $: negativeScore = negativeVotes.reduce(
        (sum, op) => sum + op.reputationAmount,
        0,
    );
    $: netScore = positiveScore - negativeScore;
    $: userHasVoted = opinions.some(
        (op) => op.authorTokenId === userProfileTokenId,
    );

    function getAvatarSvg(tokenId: string, size = 40): string {
        return jdenticon.toSvg(tokenId, size);
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }

    async function handleVote(isPositive: boolean) {
        if (!userProfileTokenId) return;

        isVoting = true;
        voteError = null;
        try {
            await voteOnSource(source.id, isPositive);
            console.log("Vote submitted");
        } catch (err: any) {
            console.error("Error voting:", err);
            voteError = err?.message || "Failed to vote";
        } finally {
            isVoting = false;
        }
    }

    function getScoreColor(score: number): string {
        if (score > 0) return "text-green-500";
        if (score < 0) return "text-red-500";
        return "text-muted-foreground";
    }

    function getStatusBadge(): { text: string; color: string } {
        if (opinions.length === 0) {
            return {
                text: "Unverified",
                color: "bg-gray-500/20 text-gray-400",
            };
        }
        if (netScore > 0) {
            return {
                text: "Verified",
                color: "bg-green-500/20 text-green-400",
            };
        }
        if (netScore < 0) {
            return { text: "Flagged", color: "bg-red-500/20 text-red-400" };
        }
        return { text: "Disputed", color: "bg-yellow-500/20 text-yellow-400" };
    }

    $: statusBadge = getStatusBadge();
</script>

<div
    class="bg-card p-4 rounded-lg border hover:border-primary/50 transition-colors"
>
    <div class="flex items-start gap-4">
        <!-- Owner Avatar -->
        <div class="flex-shrink-0">
            {@html getAvatarSvg(source.ownerTokenId, 48)}
        </div>

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
            <!-- Header: Owner + Status -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
                <a
                    href={`${get(web_explorer_uri_tkn)}${source.ownerTokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm font-medium text-primary hover:underline"
                >
                    @{source.ownerTokenId.slice(0, 8)}...
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
                    <code
                        class="text-sm bg-secondary px-2 py-1 rounded font-mono break-all"
                    >
                        {source.fileHash}
                    </code>
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
                    <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sm text-blue-400 hover:underline break-all font-mono flex items-center gap-1"
                    >
                        {source.sourceUrl}
                        <ExternalLink class="w-3 h-3 flex-shrink-0" />
                    </a>
                </div>
            </div>

            <!-- Voting Section -->
            <div class="flex items-center gap-4 flex-wrap">
                <!-- Vote Buttons -->
                {#if userProfileTokenId && !userHasVoted}
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            on:click={() => handleVote(true)}
                            disabled={isVoting}
                            class="text-xs"
                        >
                            <ThumbsUp class="w-3 h-3 mr-1" />
                            Verify
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            on:click={() => handleVote(false)}
                            disabled={isVoting}
                            class="text-xs"
                        >
                            <ThumbsDown class="w-3 h-3 mr-1" />
                            Flag Bad
                        </Button>
                    </div>
                {:else if userHasVoted}
                    <span class="text-xs text-muted-foreground">
                        ✓ You've voted on this source
                    </span>
                {/if}

                <!-- Score Display -->
                <div class="flex items-center gap-3 text-xs">
                    <div class="flex items-center gap-1">
                        <ThumbsUp class="w-3 h-3 text-green-500" />
                        <span>{positiveVotes.length}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <ThumbsDown class="w-3 h-3 text-red-500" />
                        <span>{negativeVotes.length}</span>
                    </div>
                    <div class={getScoreColor(netScore)}>
                        Score: {netScore > 0 ? "+" : ""}{netScore}
                    </div>
                </div>

                <!-- Transaction Link -->
                <a
                    href={`${get(web_explorer_uri_tx)}${source.transactionId}`}
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
