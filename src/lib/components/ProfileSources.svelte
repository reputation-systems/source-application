<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { loadSourcesByProfile } from "$lib/ergo/sourceStore";
    import {
        fileSources,
        isLoading,
        invalidFileSources,
        unavailableSources,
        reputation_proof,
        profileOpinions,
        profileInvalidations,
        profileUnavailabilities,
        profileOpinionsGiven,
    } from "$lib/ergo/store";
    import FileSourceCard from "./FileSourceCard.svelte";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Search, X, User, LayoutGrid } from "lucide-svelte";
    import Timeline from "./Timeline.svelte";
    import type { TimelineEvent } from "$lib/ergo/sourceObject";

    export let connected = false;
    export let hasProfile = false;

    let filterTokenId = "";
    let searchInput = "";
    let viewMode: "sources" | "timeline" = "sources";

    $: {
        const profileParam = $page.url.searchParams.get("profile");
        if (profileParam !== filterTokenId) {
            filterTokenId = profileParam || "";
            searchInput = profileParam || "";
        }
    }

    $: currentProfileTokenId = $reputation_proof?.token_id;
    $: activeProfileTokenId = filterTokenId || currentProfileTokenId;

    async function loadSources() {
        if (connected && hasProfile && activeProfileTokenId) {
            await loadSourcesByProfile(activeProfileTokenId);
        }
    }

    onMount(async () => {
        await loadSources();
    });

    $: if (connected && hasProfile && activeProfileTokenId) {
        if (!$fileSources[activeProfileTokenId]) {
            loadSources();
        }
    }

    function handleSearch() {
        const newFilter = searchInput.trim();
        if (newFilter === filterTokenId) return;

        const url = new URL($page.url);
        if (newFilter) {
            url.searchParams.set("profile", newFilter);
        } else {
            url.searchParams.delete("profile");
        }
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function clearFilter() {
        const url = new URL($page.url);
        url.searchParams.delete("profile");
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    $: timelineEvents = (() => {
        const events: TimelineEvent[] = [];
        if (!activeProfileTokenId) return events;

        const sources = $fileSources[activeProfileTokenId]?.data || [];
        const receivedOpinions =
            $profileOpinions[activeProfileTokenId]?.data || [];
        const givenOpinions =
            $profileOpinionsGiven[activeProfileTokenId]?.data || [];
        const invalidations =
            $profileInvalidations[activeProfileTokenId]?.data || [];
        const unavailabilities =
            $profileUnavailabilities[activeProfileTokenId]?.data || [];

        // Add sources created by this profile
        for (const source of sources) {
            events.push({
                timestamp: source.timestamp,
                type: "FILE_SOURCE",
                label: `Added a new download source`,
                color: "#22c55e", // green-500
                authorTokenId: activeProfileTokenId,
                data: { sourceUrl: source.sourceUrl },
            });
        }

        // Add invalidations created by this profile
        for (const inv of invalidations) {
            events.push({
                timestamp: inv.timestamp,
                type: "INVALID_FILE_SOURCE",
                label: `Marked a source as invalid`,
                color: "#ef4444", // red-500
                authorTokenId: activeProfileTokenId,
                data: { sourceUrl: inv.targetBoxId }, // targetBoxId is used as label hint
            });
        }

        // Add unavailabilities created by this profile
        for (const unav of unavailabilities) {
            events.push({
                timestamp: unav.timestamp,
                type: "UNAVAILABLE_SOURCE",
                label: `Marked a source as unavailable`,
                color: "#f59e0b", // amber-500
                authorTokenId: activeProfileTokenId,
                data: { sourceUrl: unav.sourceUrl },
            });
        }

        // Add opinions received by this profile
        for (const op of receivedOpinions) {
            events.push({
                timestamp: op.timestamp,
                type: "PROFILE_OPINION",
                label: op.isTrusted
                    ? `Received a trust vote`
                    : `Received a distrust vote`,
                color: op.isTrusted ? "#3b82f6" : "#6b7280", // blue-500 or gray-500
                authorTokenId: op.authorTokenId,
                data: {},
            });
        }

        // Add opinions given by this profile
        for (const op of givenOpinions) {
            events.push({
                timestamp: op.timestamp,
                type: "PROFILE_OPINION",
                label: op.isTrusted
                    ? `Gave trust to a profile`
                    : `Gave distrust to a profile`,
                color: op.isTrusted ? "#8b5cf6" : "#4b5563", // purple-500 or gray-600
                authorTokenId: activeProfileTokenId,
                data: { sourceUrl: op.targetProfileTokenId },
            });
        }

        return events;
    })();
</script>

<div class="mb-8 space-y-4">
    <div class="flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-1 space-y-2">
            <label
                for="profile-filter"
                class="text-sm font-medium text-muted-foreground flex items-center gap-2"
            >
                <Search class="w-4 h-4" />
                Filter by Profile Token ID
            </label>
            <div class="relative">
                <Input
                    id="profile-filter"
                    placeholder="Enter profile token ID..."
                    bind:value={searchInput}
                    class="pr-10"
                    on:keydown={(e) => e.key === "Enter" && handleSearch()}
                />
                {#if searchInput}
                    <button
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        on:click={clearFilter}
                    >
                        <X class="w-4 h-4" />
                    </button>
                {/if}
            </div>
        </div>
        <Button on:click={handleSearch} variant="secondary">Filter</Button>
        {#if filterTokenId}
            <Button on:click={clearFilter} variant="outline" class="gap-2">
                <User class="w-4 h-4" />
                My Profile
            </Button>
        {/if}
    </div>

    {#if activeProfileTokenId}
        <div
            class="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
            <div
                class="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 p-2 rounded-md border border-accent"
            >
                <User class="w-4 h-4" />
                <span>Viewing profile: </span>
                <code
                    class="text-primary font-mono truncate max-w-[200px] md:max-w-none"
                >
                    {activeProfileTokenId === currentProfileTokenId
                        ? "Your Profile"
                        : activeProfileTokenId.slice(0, 16) + "..."}
                </code>
            </div>

            <div class="flex bg-muted p-1 rounded-lg self-start">
                <button
                    class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all {viewMode ===
                    'sources'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'}"
                    on:click={() => (viewMode = "sources")}
                >
                    <LayoutGrid class="w-4 h-4" />
                    Sources
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
    {/if}
</div>

{#if $isLoading}
    <div class="text-center py-12">
        <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
        ></div>
        <p class="text-muted-foreground">Loading profile sources...</p>
    </div>
{:else}
    {@const sources = activeProfileTokenId
        ? $fileSources[activeProfileTokenId]?.data || []
        : []}

    {#if viewMode === "sources"}
        {#if sources.length === 0}
            <div
                class="text-center py-12 bg-card rounded-lg border border-dashed"
            >
                <p class="text-muted-foreground mb-2">
                    {filterTokenId
                        ? "This profile hasn't added any sources yet."
                        : "You haven't added any sources yet."}
                </p>
                {#if !filterTokenId}
                    <p class="text-sm text-muted-foreground">
                        Go to the "Add" tab to share your first source!
                    </p>
                {/if}
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4">
                {#each sources as source (source.id)}
                    <FileSourceCard
                        {source}
                        confirmations={[]}
                        invalidations={$invalidFileSources[source.id]?.data ||
                            []}
                        unavailabilities={$unavailableSources[source.sourceUrl]
                            ?.data || []}
                        userProfileTokenId={hasProfile
                            ? $reputation_proof?.token_id
                            : null}
                    />
                {/each}
            </div>
        {/if}
    {:else if viewMode === "timeline"}
        {#if timelineEvents.length > 0}
            <Timeline
                events={timelineEvents}
                title="Profile Activity History"
            />
        {:else}
            <div
                class="text-center py-12 bg-card rounded-lg border border-dashed"
            >
                <p class="text-muted-foreground mb-2">
                    No timeline events found for this profile.
                </p>
            </div>
        {/if}
    {/if}
{/if}
