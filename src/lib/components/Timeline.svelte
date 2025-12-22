<script lang="ts">
    import { fly } from "svelte/transition";
    import type { TimelineEvent } from "$lib/ergo/sourceObject";
    import * as jdenticon from "jdenticon";
    import { ExternalLink } from "lucide-svelte";

    export let events: TimelineEvent[] = [];
    export let title: string = "Opinion Timeline";
    export let webExplorerUriTkn: string = "";

    $: chronologicalEvents = [...events].sort(
        (a, b) => b.timestamp - a.timestamp,
    );

    function formatDate(timestamp: number) {
        return new Date(timestamp).toLocaleString();
    }

    function getRelativeTime(timestamp: number) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        if (minutes > 0)
            return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
        return "Just now";
    }

    function getAvatarSvg(tokenId: string, size = 32): string {
        return jdenticon.toSvg(tokenId, size);
    }
</script>

<div class="timeline-container">
    <h3 class="timeline-title">{title}</h3>

    {#if chronologicalEvents.length === 0}
        <p class="empty-msg">No events recorded yet.</p>
    {:else}
        <div class="timeline">
            {#each chronologicalEvents as event, i}
                <div
                    class="timeline-item"
                    in:fly={{ y: 20, delay: i * 50, duration: 400 }}
                >
                    <div
                        class="timeline-marker"
                        style="background-color: {event.color}"
                    ></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <div class="flex items-center gap-2">
                                <span
                                    class="event-type"
                                    style="color: {event.color}"
                                    >{event.type.replace(/_/g, " ")}</span
                                >
                                {#if event.authorTokenId}
                                    <div
                                        class="author-info flex items-center gap-1.5 ml-2"
                                    >
                                        <div class="author-avatar">
                                            {@html getAvatarSvg(
                                                event.authorTokenId,
                                                16,
                                            )}
                                        </div>
                                        <span class="author-name"
                                            >@{event.authorTokenId.slice(
                                                0,
                                                6,
                                            )}</span
                                        >
                                        <a
                                            href={`${webExplorerUriTkn}${event.authorTokenId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="text-muted-foreground hover:text-primary"
                                        >
                                            <ExternalLink class="w-2.5 h-2.5" />
                                        </a>
                                    </div>
                                {/if}
                            </div>
                            <span
                                class="event-time"
                                title={formatDate(event.timestamp)}
                                >{getRelativeTime(event.timestamp)}</span
                            >
                        </div>
                        <p class="event-label">{event.label}</p>
                        {#if event.data?.sourceUrl}
                            <div class="event-details">
                                <span class="url-hint"
                                    >{event.data.sourceUrl}</span
                                >
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .timeline-container {
        margin: 2rem 0;
    }

    .timeline-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 2rem;
        color: #fff;
        opacity: 0.9;
    }

    .empty-msg {
        color: #666;
        font-size: 0.875rem;
        text-align: center;
        padding: 0.5rem;
    }

    .timeline {
        position: relative;
        padding-left: 1.5rem;
    }

    .timeline::before {
        content: "";
        position: absolute;
        left: 5px;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.1);
    }

    .timeline-item {
        position: relative;
        margin-bottom: 1.25rem;
    }

    .timeline-item:last-child {
        margin-bottom: 0;
    }

    .timeline-marker {
        position: absolute;
        left: -1.5rem;
        top: 6px;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        z-index: 1;
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.2);
    }

    .timeline-content {
        padding: 0.25rem 0 1.5rem 0;
    }

    .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .event-type {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .author-info {
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .author-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .author-name {
        font-size: 0.65rem;
        color: #888;
        font-family: monospace;
    }

    .event-time {
        font-size: 0.7rem;
        color: #555;
    }

    .event-label {
        font-size: 0.85rem;
        color: #ccc;
        margin: 0;
    }

    .event-details {
        margin-top: 0.4rem;
        padding-top: 0.4rem;
        border-top: 1px solid rgba(255, 255, 255, 0.03);
    }

    .url-hint {
        font-size: 0.7rem;
        color: #777;
        word-break: break-all;
        font-family: monospace;
    }
</style>
