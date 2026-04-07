<script>import { page } from "$app/stores";
import { goto } from "$app/navigation";
import {
  groupByDownloadSource,
  groupByProfile,
  getPrimaryUrl
} from "../ergo/sourceObject";
import {} from "../ergo/sourceObject";
import {} from "../ergo/object";
import { Button } from "./ui/button/index.js";
import { Input } from "./ui/input/index.js";
import { Label } from "./ui/label/index.js";
import { Search, ThumbsUp, LayoutGrid, Users } from "lucide-svelte";
import DownloadSourceCard from "./DownloadSourceCard.svelte";
import ProfileSourceGroup from "./ProfileSourceGroup.svelte";
import Timeline from "./Timeline.svelte";
import { SEARCH_HASH_ALGORITHMS } from "../ergo/hashUtils";
export let hasProfile = false;
export let reputationProof = null;
export let explorerUri;
export let webExplorerUriTkn;
export let source_explorer_url;
export let fileSources = {};
export let invalidFileSources = {};
export let unavailableSources = {};
export let isLoading = false;
export let currentSearchHash = "";
export let onSearch;
let searchHash = "";
let searchAlgorithm = "";
let viewMode = "source";
$: {
  const searchParam = $page.url.searchParams.get("search");
  const algoParam = $page.url.searchParams.get("algorithm");
  if (searchParam && searchParam !== searchHash) {
    searchHash = searchParam;
    if (algoParam)
      searchAlgorithm = algoParam;
    onSearch(searchHash, searchAlgorithm || void 0);
  }
}
async function handleSearch() {
  const newSearch = searchHash.trim();
  if (!newSearch)
    return;
  const url = new URL($page.url);
  url.searchParams.set("search", newSearch);
  if (searchAlgorithm) {
    url.searchParams.set("algorithm", searchAlgorithm);
  } else {
    url.searchParams.delete("algorithm");
  }
  goto(url.toString(), { keepFocus: true, noScroll: true });
}
$:
  sources = fileSources[currentSearchHash]?.data || [];
$:
  groupedBySource = groupByDownloadSource(
    sources,
    invalidFileSources,
    unavailableSources
  );
$:
  groupedByProfile = groupByProfile(sources);
$:
  totalThumbsUp = sources.length;
$:
  filteredSources = searchAlgorithm ? sources.filter((s) => s.hashFunctionId === searchAlgorithm) : sources;
$:
  timelineEvents = (() => {
    const events = [];
    for (const source of filteredSources) {
      events.push({
        timestamp: source.timestamp,
        type: "FILE_SOURCE",
        label: `New download source added`,
        color: "#22c55e",
        // green-500
        authorTokenId: source.ownerTokenId,
        data: { sourceUrl: getPrimaryUrl(source) }
      });
    }
    for (const boxId in invalidFileSources) {
      const invs = invalidFileSources[boxId]?.data || [];
      const targetSource = filteredSources.find((s) => s.id === boxId);
      if (targetSource) {
        for (const inv of invs) {
          events.push({
            timestamp: inv.timestamp,
            type: "INVALID_FILE_SOURCE",
            label: `Source marked as invalid`,
            color: "#ef4444",
            // red-500
            authorTokenId: inv.authorTokenId,
            data: { sourceUrl: getPrimaryUrl(targetSource) }
          });
        }
      }
    }
    for (const url in unavailableSources) {
      const unavs = unavailableSources[url]?.data || [];
      if (filteredSources.some((s) => s.source?.urlLink === url)) {
        for (const unav of unavs) {
          events.push({
            timestamp: unav.timestamp,
            type: "UNAVAILABLE_SOURCE",
            label: `Source marked as unavailable`,
            color: "#f59e0b",
            // amber-500
            authorTokenId: unav.authorTokenId,
            data: { sourceUrl: url }
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
        Enter the hash of the file you're looking for
    </p>
    <div class="flex flex-col gap-2">
        <div class="flex gap-2">
            <Input
                type="text"
                id="search-hash"
                bind:value={searchHash}
                placeholder="Enter file hash (64 hex characters)"
                class="font-mono text-sm"
            />
            <Button on:click={handleSearch} disabled={!searchHash.trim()}>
                <Search class="w-4 h-4 mr-2" />
                Search
            </Button>
        </div>
        <div>
            <Label for="search-algorithm" class="text-xs text-muted-foreground">Hash Algorithm (optional filter)</Label>
            <select
                id="search-algorithm"
                bind:value={searchAlgorithm}
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            >
                <option value="">All algorithms</option>
                {#each SEARCH_HASH_ALGORITHMS as algo}
                    <option value={algo.value}>{algo.label} ({algo.value})</option>
                {/each}
            </select>
        </div>
    </div>
</div>

{#if currentSearchHash}
    <div
        class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
        <div>
            <h3 class="text-lg font-semibold flex items-center gap-2">
                Results for: <span
                    class="font-mono text-sm text-muted-foreground"
                    >{currentSearchHash.slice(0, 16)}...</span
                >
                {#if searchAlgorithm}
                    <span class="text-xs bg-secondary px-2 py-0.5 rounded font-mono">
                        {searchAlgorithm}
                    </span>
                {/if}
            </h3>
            <div class="flex items-center gap-2 mt-1">
                <div
                    class="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs font-medium"
                >
                    <ThumbsUp class="w-3.5 h-3.5" />
                    <span>{filteredSources.length} Total Sources</span>
                </div>
            </div>
        </div>

        {#if filteredSources.length > 0}
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

{#if isLoading}
    <div class="text-center py-12">
        <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
        ></div>
        <p class="text-muted-foreground">Searching sources...</p>
    </div>
{:else if currentSearchHash && filteredSources.length === 0}
    <div class="text-center py-12 bg-card rounded-lg border border-dashed">
        <p class="text-muted-foreground">No sources found for this hash{searchAlgorithm ? ` with algorithm ${searchAlgorithm}` : ''}</p>
    </div>
{:else if filteredSources.length > 0}
    <div class="space-y-4">
        {#if viewMode === "source"}
            {#each groupByDownloadSource(filteredSources, invalidFileSources, unavailableSources) as group (group.sourceUrl)}
                <DownloadSourceCard
                    {group}
                    fileHash={currentSearchHash}
                    userProfileTokenId={hasProfile
                        ? (reputationProof?.token_id ?? null)
                        : null}
                    {reputationProof}
                    {explorerUri}
                    {source_explorer_url}
                    currentSources={filteredSources}
                />
            {/each}
        {:else if viewMode === "profile"}
            {#each groupByProfile(filteredSources) as group (group.profileTokenId)}
                <ProfileSourceGroup
                    {group}
                    {invalidFileSources}
                    {unavailableSources}
                    {webExplorerUriTkn}
                    {source_explorer_url}
                />
            {/each}
        {:else if viewMode === "timeline"}
            <Timeline
                events={timelineEvents}
                title="File Source Opinion History"
                {webExplorerUriTkn}
                {source_explorer_url}
            />
        {/if}
    </div>
{/if}
