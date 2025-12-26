<script lang="ts">
    import { addFileSource } from "$lib/ergo/sourceStore";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { AlertTriangle } from "lucide-svelte";
    import { type ReputationProof } from "$lib/ergo/object";

    // Props for island mode
    export let profile: ReputationProof | null = null;
    export let explorerUri: string;
    export let onSourceAdded: ((txId: string) => void) | null = null;
    export let hash: string | undefined = undefined;

    let className: string = "";
    export { className as class };

    const hasProfile = profile !== null;
    const baseClasses = "bg-card p-6 rounded-lg border";

    let newFileHash = hash || "";
    $: if (hash !== undefined) {
        newFileHash = hash;
    }
    let newSourceUrl = "";
    let isAddingSource = false;
    let addError: string | null = null;

    async function handleAddSource() {
        if (!newFileHash.trim() || !newSourceUrl.trim() || !profile) return;

        isAddingSource = true;
        addError = null;
        try {
            const tx = await addFileSource(
                newFileHash.trim(),
                newSourceUrl.trim(),
                profile,
                explorerUri,
            );
            console.log("Source added, tx:", tx);
            newFileHash = "";
            newSourceUrl = "";

            if (onSourceAdded) {
                onSourceAdded(tx);
            }
        } catch (err: any) {
            console.error("Error adding source:", err);
            addError = err?.message || "Failed to add source";
        } finally {
            isAddingSource = false;
        }
    }
</script>

<div class="{baseClasses} {className}">
    <h3 class="text-xl font-semibold mb-4">Add New File Source</h3>

    <div
        class="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg mb-4 flex gap-2"
    >
        <AlertTriangle class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-amber-200">
            <strong>Security Warning:</strong> Always verify URLs before downloading.
            Malicious actors may post harmful links. The URL you provide will be
            publicly visible and immutable on the blockchain.
        </div>
    </div>

    {#if addError}
        <div class="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4">
            <p class="text-sm text-red-200">{addError}</p>
        </div>
    {/if}

    <div class="space-y-4">
        {#if hash === undefined}
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
        {/if}

        <div>
            <Label for="source-url">Source URL</Label>
            <Textarea
                id="source-url"
                bind:value={newSourceUrl}
                placeholder="https://example.com/file.zip or ipfs://... or magnet:..."
                rows={2}
                class="font-mono text-sm"
                disabled={!hasProfile}
            />
            <p class="text-xs text-muted-foreground mt-1">
                HTTP(S) URL, IPFS CID, Magnet link, or any download source.
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
