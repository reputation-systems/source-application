<script lang="ts">
    import {
        type ProfileSourceGroup,
        type InvalidFileSource,
        type UnavailableSource,
    } from "$lib/ergo/sourceObject";
    import { type CachedData } from "$lib/ergo/store";
    import * as jdenticon from "jdenticon";
    import { ExternalLink, ThumbsDown, CloudOff } from "lucide-svelte";

    export let group: ProfileSourceGroup;
    export let invalidFileSources: CachedData<InvalidFileSource[]> = {};
    export let unavailableSources: CachedData<UnavailableSource[]> = {};
    export let webExplorerUriTkn: string;

    function getAvatarSvg(tokenId: string, size = 48): string {
        return jdenticon.toSvg(tokenId, size);
    }

    function getInvalidations(sourceId: string) {
        return invalidFileSources[sourceId]?.data || [];
    }

    function getUnavailabilities(sourceUrl: string) {
        return unavailableSources[sourceUrl]?.data || [];
    }
</script>

<div class="py-6 border-b last:border-0">
    <div class="flex items-start gap-4">
        <!-- Profile Avatar -->
        <div class="flex-shrink-0">
            {@html getAvatarSvg(group.profileTokenId)}
        </div>

        <div class="flex-1 min-w-0">
            <!-- Profile Header -->
            <div class="flex items-center gap-2 mb-3">
                <span class="text-sm font-medium text-primary">
                    @{group.profileTokenId.slice(0, 8)}...
                </span>
                <a
                    href={`${webExplorerUriTkn}${group.profileTokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-muted-foreground hover:text-primary"
                >
                    <ExternalLink class="w-3 h-3" />
                </a>
            </div>

            <!-- Sources List -->
            <div class="space-y-3">
                {#each group.sources as source}
                    {@const invs = getInvalidations(source.id)}
                    {@const unavs = getUnavailabilities(source.sourceUrl)}

                    <div class="py-1">
                        <div class="flex items-start justify-between gap-2">
                            <a
                                href={source.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs text-blue-400 hover:underline break-all font-mono flex items-center gap-1"
                            >
                                {source.sourceUrl}
                                <ExternalLink class="w-2 h-2 flex-shrink-0" />
                            </a>

                            <div
                                class="flex items-center gap-2 text-[10px] flex-shrink-0"
                            >
                                <div
                                    class="flex items-center gap-0.5"
                                    title="Invalidations"
                                >
                                    <ThumbsDown
                                        class="w-2.5 h-2.5 text-red-500"
                                    />
                                    <span>{invs.length}</span>
                                </div>
                                <div
                                    class="flex items-center gap-0.5"
                                    title="Unavailabilities"
                                >
                                    <CloudOff
                                        class="w-2.5 h-2.5 text-orange-500"
                                    />
                                    <span>{unavs.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
