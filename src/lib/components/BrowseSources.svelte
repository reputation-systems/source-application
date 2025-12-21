<script lang="ts">
    import { onMount } from "svelte";
    import { loadAllSources } from "$lib/ergo/sourceStore";
    import {
        fileSources,
        isLoading,
        sourceOpinions,
        reputation_proof,
    } from "$lib/ergo/store";
    import FileSourceCard from "./FileSourceCard.svelte";

    export let connected = false;
    export let hasProfile = false;

    onMount(async () => {
        if (connected && hasProfile) {
            await loadAllSources();
        }
    });

    $: if (connected && hasProfile && Object.keys($fileSources).length === 0) {
        loadAllSources();
    }
</script>

{#if $isLoading}
    <div class="text-center py-8">
        <p class="text-muted-foreground">Loading sources...</p>
    </div>
{:else}
    {@const sources = $fileSources["ALL"]?.data || []}

    {#if sources.length === 0}
        <div class="text-center py-8">
            <p class="text-muted-foreground">
                No file sources yet. Be the first to add one!
            </p>
        </div>
    {:else}
        <div class="space-y-4">
            {#each sources as source (source.id)}
                <FileSourceCard
                    {source}
                    opinions={$sourceOpinions[source.id]?.data || []}
                    userProfileTokenId={hasProfile
                        ? $reputation_proof?.token_id
                        : null}
                />
            {/each}
        </div>
    {/if}
{/if}
