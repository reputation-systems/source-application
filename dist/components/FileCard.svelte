<script>import { addFileSource } from "../ergo/sourceStore";
import {
  groupByDownloadSource,
  groupByProfile,
  getPrimaryUrl
} from "../ergo/sourceObject";
import {
  LayoutGrid,
  Users,
  Search,
  ThumbsUp
} from "lucide-svelte";
import DownloadSourceCard from "./DownloadSourceCard.svelte";
import ProfileSourceGroup from "./ProfileSourceGroup.svelte";
import Timeline from "./Timeline.svelte";
import {} from "../ergo/object";
import {} from "../ergo/sourceObject";
import { Label } from "./ui/label/index.js";
export let fileHash;
export let profile = null;
export let sources = [];
export let invalidFileSources = {};
export let unavailableSources = {};
export let isLoading = false;
export let explorerUri;
export let source_explorer_url;
export let webExplorerUriTkn;
let className = "";
export { className as class };
let viewMode = "source";
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
      const primaryUrl = getPrimaryUrl(source);
      events.push({
        timestamp: source.timestamp,
        type: "FILE_SOURCE",
        label: `New download source added`,
        color: "#22c55e",
        // green-500
        authorTokenId: source.ownerTokenId,
        data: { sourceUrl: primaryUrl }
      });
    }
    for (const boxId in invalidFileSources) {
      const invs = invalidFileSources[boxId]?.data || [];
      const targetSource = sources.find((s) => s.id === boxId);
      if (targetSource) {
        const targetPrimaryUrl = getPrimaryUrl(targetSource);
        for (const inv of invs) {
          events.push({
            timestamp: inv.timestamp,
            type: "INVALID_FILE_SOURCE",
            label: `Source marked as invalid`,
            color: "#ef4444",
            // red-500
            authorTokenId: inv.authorTokenId,
            data: { sourceUrl: targetPrimaryUrl }
          });
        }
      }
    }
    for (const url in unavailableSources) {
      const unavs = unavailableSources[url]?.data || [];
      if (sources.some((s) => s.source?.urlLink === url)) {
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
                        {source_explorer_url}
                        userProfileTokenId={profile?.token_id ?? null}
                    />
                {/each}
            {:else if viewMode === "profile"}
                {#each groupedByProfile as group (group.profileTokenId)}
                    <ProfileSourceGroup
                        {group}
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
</div>
