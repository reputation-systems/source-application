<script lang="ts">
    import { onMount } from "svelte";
    import {
        fileSources,
        isLoading,
        error,
        currentSearchHash,
        sourceOpinions,
        addFileSource,
        searchByHash,
        loadAllSources,
        createProfileBox,
    } from "$lib/ergo/sourceStore";
    import { reputation_proof } from "$lib/ergo/store";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Search, Plus, UserPlus, AlertTriangle } from "lucide-svelte";
    import FileSourceCard from "./FileSourceCard.svelte";

    // Props
    export let connected = false;

    // Local state
    let searchHash = "";
    let newFileHash = "";
    let newSourceUrl = "";
    let isAddingSource = false;
    let addError: string | null = null;
    let isCreatingProfile = false;
    let activeTab: "search" | "browse" | "add" = "browse";

    $: hasProfile =
        $reputation_proof !== null &&
        $reputation_proof?.current_boxes?.length > 0;

    async function handleSearch() {
        if (!searchHash.trim()) return;
        activeTab = "search";
        await searchByHash(searchHash.trim());
    }

    async function handleAddSource() {
        if (!newFileHash.trim() || !newSourceUrl.trim()) return;

        isAddingSource = true;
        addError = null;
        try {
            const tx = await addFileSource(
                newFileHash.trim(),
                newSourceUrl.trim(),
            );
            console.log("Source added, tx:", tx);
            newFileHash = "";
            newSourceUrl = "";
            // Refresh the browse list
            await loadAllSources();
        } catch (err: any) {
            console.error("Error adding source:", err);
            addError = err?.message || "Failed to add source";
        } finally {
            isAddingSource = false;
        }
    }

    async function handleCreateProfile() {
        isCreatingProfile = true;
        addError = null;
        try {
            await createProfileBox();
        } catch (err: any) {
            console.error("Error creating profile:", err);
            addError = err?.message || "Failed to create profile";
        } finally {
            isCreatingProfile = false;
        }
    }

    onMount(async () => {
        if (connected && hasProfile) {
            await loadAllSources();
        }
    });

    $: if (connected && hasProfile && Object.keys($fileSources).length === 0) {
        loadAllSources();
    }
</script>

<div class="source-app w-full max-w-6xl mx-auto">
    <!-- Tab Navigation -->
    <div class="flex gap-2 mb-6 border-b border-border">
        <button
            class="tab-button {activeTab === 'browse' ? 'active' : ''}"
            on:click={() => {
                activeTab = "browse";
                if (connected && hasProfile) loadAllSources();
            }}
        >
            Browse Sources
        </button>
        <button
            class="tab-button {activeTab === 'search' ? 'active' : ''}"
            on:click={() => (activeTab = "search")}
        >
            <Search class="w-4 h-4 mr-1" />
            Search by Hash
        </button>
        <button
            class="tab-button {activeTab === 'add' ? 'active' : ''}"
            on:click={() => (activeTab = "add")}
        >
            <Plus class="w-4 h-4 mr-1" />
            Add Source
        </button>
    </div>

    <!-- Connection/Profile Status -->
    {#if !connected}
        <div
            class="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-center mb-6"
        >
            <p class="text-amber-200">
                Connect your wallet to use the Source Verification system
            </p>
        </div>
    {:else if !hasProfile}
        <div class="bg-card p-4 rounded-lg border mb-6">
            <h4 class="font-semibold mb-2">Create Your Profile</h4>
            <p class="text-sm text-muted-foreground mb-3">
                You need to create a profile before adding sources or voting.
                This is a one-time blockchain transaction.
            </p>
            <Button
                on:click={handleCreateProfile}
                disabled={isCreatingProfile}
                class="w-full"
            >
                <UserPlus class="w-4 h-4 mr-2" />
                {isCreatingProfile
                    ? "Creating Profile..."
                    : "Create Profile (One-time)"}
            </Button>
        </div>
    {/if}

    <!-- Error Display -->
    {#if addError || $error}
        <div
            class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-4"
        >
            <p class="text-sm text-blue-200">{addError || $error}</p>
        </div>
    {/if}

    <!-- SEARCH TAB -->
    {#if activeTab === "search"}
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
    {/if}

    <!-- ADD SOURCE TAB -->
    {#if activeTab === "add"}
        <div class="bg-card p-6 rounded-lg border mb-6">
            <h3 class="text-xl font-semibold mb-4">Add New File Source</h3>

            <div
                class="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg mb-4 flex gap-2"
            >
                <AlertTriangle
                    class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                />
                <div class="text-sm text-amber-200">
                    <strong>Security Warning:</strong> Always verify URLs before
                    downloading. Malicious actors may post harmful links. The URL
                    you provide will be publicly visible and immutable on the blockchain.
                </div>
            </div>

            <div class="space-y-4">
                <div>
                    <Label for="file-hash">File Hash (Blake2b256)</Label>
                    <Input
                        type="text"
                        id="file-hash"
                        bind:value={newFileHash}
                        placeholder="64-character hexadecimal hash"
                        class="font-mono text-sm"
                        disabled={!hasProfile}
                    />
                    <p class="text-xs text-muted-foreground mt-1">
                        This is the unique identifier for the file. Users will
                        search by this hash.
                    </p>
                </div>

                <div>
                    <Label for="source-url">Source URL</Label>
                    <Textarea
                        id="source-url"
                        bind:value={newSourceUrl}
                        placeholder="https://example.com/file.zip or ipfs://... or magnet:..."
                        rows="2"
                        class="font-mono text-sm"
                        disabled={!hasProfile}
                    />
                    <p class="text-xs text-muted-foreground mt-1">
                        HTTP(S) URL, IPFS CID, Magnet link, or any download
                        source.
                    </p>
                </div>

                <Button
                    on:click={handleAddSource}
                    disabled={isAddingSource ||
                        !hasProfile ||
                        !newFileHash.trim() ||
                        !newSourceUrl.trim()}
                    class="w-full"
                >
                    {isAddingSource ? "Adding Source..." : "Add Source"}
                </Button>
            </div>
        </div>
    {/if}

    <!-- SOURCES LIST (for both search and browse) -->
    {#if $isLoading}
        <div class="text-center py-8">
            <p class="text-muted-foreground">Loading sources...</p>
        </div>
    {:else}
        {@const sources =
            activeTab === "search"
                ? $fileSources[$currentSearchHash]?.data || []
                : $fileSources["ALL"]?.data || []}

        {#if sources.length === 0}
            <div class="text-center py-8">
                <p class="text-muted-foreground">
                    {activeTab === "search"
                        ? "No sources found for this hash"
                        : "No file sources yet. Be the first to add one!"}
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
</div>

<style lang="postcss">
    .tab-button {
        @apply px-4 py-2 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground hover:border-border transition-colors flex items-center;
    }

    .tab-button.active {
        @apply text-foreground border-primary;
    }
</style>
