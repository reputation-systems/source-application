<script lang="ts">
    import { searchByHash } from "$lib/ergo/sourceStore";
    import {
        fileSources,
        isLoading,
        invalidFileSources,
        unavailableSources,
        reputation_proof,
    } from "$lib/ergo/store";
    import {
        groupByDownloadSource,
        groupByProfile,
        type TimelineEvent,
    } from "$lib/ergo/sourceObject";
    import { LayoutGrid, Users, Search, ThumbsUp } from "lucide-svelte";
    import DownloadSourceCard from "./DownloadSourceCard.svelte";
    import ProfileSourceGroup from "./ProfileSourceGroup.svelte";
    import Timeline from "./Timeline.svelte";
    import { type ReputationProof } from "$lib/ergo/object";

    export let fileHash: string;
    export let profile: ReputationProof | null = null;
    let className: string = "";
    export { className as class };

    let viewMode: "source" | "profile" | "timeline" = "source";

    // Update global profile if provided
    $: if (profile) {
        reputation_proof.set(profile);
    }

    // Fetch data when fileHash changes
    $: if (fileHash) {
        searchByHash(fileHash);
    }

    $: sources = $fileSources[fileHash]?.data || [];
    $: groupedBySource = groupByDownloadSource(
        sources,
        $invalidFileSources,
        $unavailableSources,
    );
    $: groupedByProfile = groupByProfile(sources);

    $: totalThumbsUp = sources.length;

    $: timelineEvents = (() => {
        const events: TimelineEvent[] = [];

        // Add sources
        for (const source of sources) {
            events.push({
                timestamp: source.timestamp,
                type: "FILE_SOURCE",
                label: `New download source added`,
                color: "#22c55e", // green-500
                authorTokenId: source.ownerTokenId,
                data: { sourceUrl: source.sourceUrl },
            });
        }

        // Add invalidations
        for (const boxId in $invalidFileSources) {
            const invs = $invalidFileSources[boxId].data;
            const targetSource = sources.find((s) => s.id === boxId);
            if (targetSource) {
                for (const inv of invs) {
                    events.push({
                        timestamp: inv.timestamp,
                        type: "INVALID_FILE_SOURCE",
                        label: `Source marked as invalid`,
                        color: "#ef4444", // red-500
                        authorTokenId: inv.authorTokenId,
                        data: { sourceUrl: targetSource.sourceUrl },
                    });
                }
            }
        }

        // Add unavailabilities
        for (const url in $unavailableSources) {
            const unavs = $unavailableSources[url].data;
            if (sources.some((s) => s.sourceUrl === url)) {
                for (const unav of unavs) {
                    events.push({
                        timestamp: unav.timestamp,
                        type: "UNAVAILABLE_SOURCE",
                        label: `Source marked as unavailable`,
                        color: "#f59e0b", // amber-500
                        authorTokenId: unav.authorTokenId,
                        data: { sourceUrl: url },
                    });
                }
            }
        }

        return events;
    })();
</script>

<div class={className}>
    {#if $isLoading}
        <div class="text-center py-12">
            <div
                class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
            ></div>
            <p class="text-muted-foreground">Loading sources...</p>
        </div>
    {:else if sources.length === 0}
        <div class="text-center py-12 bg-card rounded-lg border border-dashed">
            <p class="text-muted-foreground">No sources found for this hash</p>
        </div>
    {:else}
        <div
            class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
            <div>
                <div class="flex items-center gap-2 mt-1">
                    <div
                        class="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs font-medium"
                    >
                        <ThumbsUp class="w-3.5 h-3.5" />
                        <span>{totalThumbsUp} Total Sources</span>
                    </div>
                </div>
            </div>

            <div class="flex bg-muted p-1 rounded-lg self-start">
                <button
                    class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all {viewMode ===
                    'source'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'}"
                    on:click={() => (viewMode = "source")}
                >
                    <LayoutGrid class="w-4 h-4" />
                    By Source
                </button>
                <button
                    class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all {viewMode ===
                    'profile'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'}"
                    on:click={() => (viewMode = "profile")}
                >
                    <Users class="w-4 h-4" />
                    By Profile
                </button>
                <button
                    class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all {viewMode ===
                    'timeline'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'}"
                    on:click={() => (viewMode = "timeline")}
                >
                    <Search class="w-4 h-4" />
                    Timeline
                </button>
            </div>
        </div>

        <div class="space-y-4">
            {#if viewMode === "source"}
                {#each groupedBySource as group (group.sourceUrl)}
                    <DownloadSourceCard
                        {group}
                        {fileHash}
                        totalFileSources={totalThumbsUp}
                        userProfileTokenId={profile?.token_id ?? null}
                    />
                {/each}
            {:else if viewMode === "profile"}
                {#each groupedByProfile as group (group.profileTokenId)}
                    <ProfileSourceGroup {group} />
                {/each}
            {:else if viewMode === "timeline"}
                <Timeline
                    events={timelineEvents}
                    title="File Source Opinion History"
                />
            {/if}
        </div>
    {/if}
</div>
