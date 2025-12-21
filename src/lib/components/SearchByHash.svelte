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
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Search } from "lucide-svelte";
    import FileSourceCard from "./FileSourceCard.svelte";

    export let hasProfile = false;

    let searchHash = "";

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
    <div class="mb-4">
        <h3 class="text-lg font-semibold">
            Results for: <span class="font-mono text-sm"
                >{$currentSearchHash.slice(0, 16)}...</span
            >
        </h3>
    </div>
{/if}

{#if $isLoading}
    <div class="text-center py-8">
        <p class="text-muted-foreground">Searching sources...</p>
    </div>
{:else}
    {@const sources = $fileSources[$currentSearchHash]?.data || []}

    {#if $currentSearchHash && sources.length === 0}
        <div class="text-center py-8">
            <p class="text-muted-foreground">No sources found for this hash</p>
        </div>
    {:else if sources.length > 0}
        <div class="space-y-4">
            {#each sources as source (source.id)}
                <FileSourceCard
                    {source}
                    confirmations={sources}
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
