<script>import { addFileSource } from "../ergo/sourceStore";
import {
  groupByDownloadSource,
  groupByProfile
} from "../ergo/sourceObject";
import {
  LayoutGrid,
  Users,
  Search,
  ThumbsUp,
  AlertTriangle
} from "lucide-svelte";
import DownloadSourceCard from "./DownloadSourceCard.svelte";
import ProfileSourceGroup from "./ProfileSourceGroup.svelte";
import Timeline from "./Timeline.svelte";
import {} from "../ergo/object";
import {} from "../ergo/sourceObject";
import { Button } from "./ui/button/index.js";
import { Input } from "./ui/input/index.js";
import { Label } from "./ui/label/index.js";
export let fileHash;
export let profile = null;
export let sources = [];
export let invalidFileSources = {};
export let unavailableSources = {};
export let isLoading = false;
export let explorerUri;
export let webExplorerUriTkn;
let className = "";
export { className as class };
let viewMode = "source";
let newSourceUrl = "";
let isAddingSource = false;
let addError = null;
function getInvalidations(boxId) {
  return invalidFileSources[boxId]?.data || [];
}
function getUnavailabilities(url) {
  return unavailableSources[url]?.data || [];
}
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
  timelineEvents = (() => {
    const events = [];
    for (const source of sources) {
      events.push({
        timestamp: source.timestamp,
        type: "FILE_SOURCE",
        label: `New download source added`,
        color: "#22c55e",
        // green-500
        authorTokenId: source.ownerTokenId,
        data: { sourceUrl: source.sourceUrl }
      });
    }
    for (const boxId in invalidFileSources) {
      const invs = invalidFileSources[boxId]?.data || [];
      const targetSource = sources.find((s) => s.id === boxId);
      if (targetSource) {
        for (const inv of invs) {
          events.push({
            timestamp: inv.timestamp,
            type: "INVALID_FILE_SOURCE",
            label: `Source marked as invalid`,
            color: "#ef4444",
            // red-500
            authorTokenId: inv.authorTokenId,
            data: { sourceUrl: targetSource.sourceUrl }
          });
        }
      }
    }
    for (const url in unavailableSources) {
      const unavs = unavailableSources[url]?.data || [];
      if (sources.some((s) => s.sourceUrl === url)) {
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
async function handleAddSource() {
  if (!newSourceUrl.trim() || !profile)
    return;
  isAddingSource = true;
  addError = null;
  try {
    const tx = await addFileSource(
      fileHash.trim(),
      newSourceUrl.trim(),
      profile,
      explorerUri
    );
    console.log("Source added, tx:", tx);
    newSourceUrl = "";
  } catch (err) {
    console.error("Error adding source:", err);
    addError = err?.message || "Failed to add source";
  } finally {
    isAddingSource = false;
  }
}
</script>

<div class={className}>
    <div class="mb-8 border-b pb-4">
        <Label
            class="text-[10px] text-muted-foreground uppercase tracking-widest font-bold"
            >File Hash</Label
        >
        <div class="font-mono text-xs break-all mt-1 select-all opacity-70">
            {fileHash}
        </div>
    </div>

    {#if isLoading}
        <div class="text-center py-12">
            <div
                class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
            ></div>
            <p class="text-muted-foreground">Loading sources...</p>
        </div>
    {:else if sources.length === 0}
        <div class="py-8">
            <div class="text-center mb-8">
                <p class="text-muted-foreground">
                    No sources found for this hash
                </p>
            </div>

            <div class="max-w-md mx-auto text-left py-6">
                <h4 class="font-semibold mb-6 text-lg">Add First Source</h4>

                <div
                    class="text-xs text-amber-500/80 mb-6 flex gap-2 items-start"
                >
                    <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                        Verify URLs before adding. They will be immutable on the
                        blockchain.
                    </p>
                </div>

                {#if addError}
                    <div
                        class="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4"
                    >
                        <p class="text-xs text-red-200">{addError}</p>
                    </div>
                {/if}

                <div class="space-y-4">
                    <div>
                        <Label for="new-source-url">Source URL</Label>
                        <Input
                            id="new-source-url"
                            bind:value={newSourceUrl}
                            placeholder="https://example.com/file.zip"
                            class="font-mono text-sm bg-background"
                            disabled={!profile || isAddingSource}
                        />
                    </div>

                    <Button
                        on:click={handleAddSource}
                        disabled={!profile ||
                            !newSourceUrl.trim() ||
                            isAddingSource}
                        class="w-full"
                    >
                        {isAddingSource ? "Adding Source..." : "Add Source"}
                    </Button>

                    {#if !profile}
                        <p class="text-xs text-center text-muted-foreground">
                            You must have a profile to add sources.
                        </p>
                    {/if}
                </div>
            </div>
        </div>
    {:else}
        <div
            class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
            <div>
                <div class="flex items-center gap-2 mt-1">
                    <div
                        class="flex items-center gap-1.5 text-green-500 text-xs font-semibold uppercase tracking-wider"
                    >
                        <ThumbsUp class="w-3.5 h-3.5" />
                        <span>{totalThumbsUp} Total Sources</span>
                    </div>
                </div>
            </div>

            <div class="flex border-b self-start">
                <button
                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[2px] {viewMode ===
                    'source'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'}"
                    on:click={() => (viewMode = "source")}
                >
                    <LayoutGrid class="w-4 h-4" />
                    By Source
                </button>
                <button
                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[2px] {viewMode ===
                    'profile'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'}"
                    on:click={() => (viewMode = "profile")}
                >
                    <Users class="w-4 h-4" />
                    By Profile
                </button>
                <button
                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[2px] {viewMode ===
                    'timeline'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'}"
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
                        {explorerUri}
                        userProfileTokenId={profile?.token_id ?? null}
                    />
                {/each}
            {:else if viewMode === "profile"}
                {#each groupedByProfile as group (group.profileTokenId)}
                    <ProfileSourceGroup {group} {webExplorerUriTkn} />
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
