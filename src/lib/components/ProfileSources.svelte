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
    } from "$lib/ergo/store";
    import FileSourceCard from "./FileSourceCard.svelte";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Search, X, User } from "lucide-svelte";

    export let connected = false;
    export let hasProfile = false;

    let filterTokenId = "";
    let searchInput = "";

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
            class="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 p-2 rounded-md border border-accent"
        >
            <User class="w-4 h-4" />
            <span>Viewing sources for: </span>
            <code
                class="text-primary font-mono truncate max-w-[200px] md:max-w-none"
            >
                {activeProfileTokenId === currentProfileTokenId
                    ? "Your Profile"
                    : activeProfileTokenId}
            </code>
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

    {#if sources.length === 0}
        <div class="text-center py-12 bg-card rounded-lg border border-dashed">
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
                    invalidations={$invalidFileSources[source.id]?.data || []}
                    unavailabilities={$unavailableSources[source.sourceUrl]
                        ?.data || []}
                    userProfileTokenId={hasProfile
                        ? $reputation_proof?.token_id
                        : null}
                />
            {/each}
        </div>
    {/if}
{/if}
