<script lang="ts">
    import { searchByHash } from "$lib/ergo/sourceStore";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import {
        fileSources,
        isLoading,
        currentSearchHash,
        invalidFileSources,
        unavailableSources,
        reputation_proof,
    } from "$lib/ergo/store";
    import {
        groupByDownloadSource,
        groupByProfile,
        type TimelineEvent,
    } from "$lib/ergo/sourceObject";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Search, ThumbsUp, LayoutGrid, Users } from "lucide-svelte";
    import DownloadSourceCard from "./DownloadSourceCard.svelte";
    import ProfileSourceGroup from "./ProfileSourceGroup.svelte";
    import Timeline from "./Timeline.svelte";

    export let hasProfile = false;

    let searchHash = "";
    let viewMode: "source" | "profile" | "timeline" = "source";

    $: {
        const searchParam = $page.url.searchParams.get("search");
        if (searchParam && searchParam !== searchHash) {
            searchHash = searchParam;
            searchByHash(searchHash);
        }
    }

    async function handleSearch() {
        const newSearch = searchHash.trim();
        if (!newSearch) return;

        const url = new URL($page.url);
        url.searchParams.set("search", newSearch);
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    $: sources = $fileSources[$currentSearchHash]?.data || [];
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

<div class="mb-6">
    <Label for="search-hash" class="text-base font-semibold"
        >Search by File Hash</Label
    >
    <p class="text-sm text-muted-foreground mb-3">
        Enter the Blake2b256 hash of the file you're looking for
    </p>
    <div class="flex gap-2">
        <Input
            type="text"
            id="search-hash"
            bind:value={searchHash}
            placeholder="Enter Blake2b256 hash (64 hex characters)"
            class="font-mono text-sm"
        />
        <Button on:click={handleSearch} disabled={!searchHash.trim()}>
            <Search class="w-4 h-4 mr-2" />
            Search
        </Button>
    </div>
</div>

{#if $currentSearchHash}
    <div
        class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
        <div>
            <h3 class="text-lg font-semibold flex items-center gap-2">
                Results for: <span
                    class="font-mono text-sm text-muted-foreground"
                    >{$currentSearchHash.slice(0, 16)}...</span
                >
            </h3>
            <div class="flex items-center gap-2 mt-1">
                <div
                    class="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs font-medium"
                >
                    <ThumbsUp class="w-3.5 h-3.5" />
                    <span>{totalThumbsUp} Total Sources</span>
                </div>
            </div>
        </div>

        {#if sources.length > 0}
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
        {/if}
    </div>
{/if}

{#if $isLoading}
    <div class="text-center py-12">
        <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
        ></div>
        <p class="text-muted-foreground">Searching sources...</p>
    </div>
{:else if $currentSearchHash && sources.length === 0}
    <div class="text-center py-12 bg-card rounded-lg border border-dashed">
        <p class="text-muted-foreground">No sources found for this hash</p>
    </div>
{:else if sources.length > 0}
    <div class="space-y-4">
        {#if viewMode === "source"}
            {#each groupedBySource as group (group.sourceUrl)}
                <DownloadSourceCard
                    {group}
                    fileHash={$currentSearchHash}
                    totalFileSources={totalThumbsUp}
                    userProfileTokenId={hasProfile
                        ? $reputation_proof?.token_id
                        : null}
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
