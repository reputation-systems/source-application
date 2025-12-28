<script lang="ts">
    import { addFileSource } from "$lib/ergo/sourceStore";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { AlertTriangle, Download, Upload, Loader2 } from "lucide-svelte";
    import { type ReputationProof } from "$lib/ergo/object";
    import { blake2b256 } from "@fleet-sdk/crypto";
    import { uint8ArrayToHex } from "$lib/ergo/utils";
    import { get, type Writable } from "svelte/store";

    // Props for island mode
    export let profile: ReputationProof | null = null;
    export let explorerUri: string;
    export let onSourceAdded: ((txId: string) => void) | null = null;
    export let hash: Writable<string> | undefined = undefined;

    let className: string = "";
    export { className as class };

    const hasProfile = profile !== null;
    const baseClasses = "bg-card p-6 rounded-lg border";

    let newFileHash = "";
    let newSourceUrl = "";
    let isAddingSource = false;
    let addError: string | null = null;

    let isCalculatingHash = false;
    let hashError: string | null = null;

    // Sync newFileHash with store if provided
    $: if (hash) {
        newFileHash = get(hash);
    }

    function updateHash(val: string) {
        newFileHash = val;
        if (hash) {
            hash.set(val);
        }
    }

    async function calculateHashFromUrl() {
        if (!newSourceUrl.trim()) return;

        isCalculatingHash = true;
        hashError = null;
        try {
            const response = await fetch(newSourceUrl.trim());
            if (!response.ok)
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const hashResult = blake2b256(bytes);
            updateHash(uint8ArrayToHex(hashResult));
        } catch (err: any) {
            console.error("Error calculating hash from URL:", err);
            hashError = err?.message || "Failed to calculate hash from URL";
        } finally {
            isCalculatingHash = false;
        }
    }

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        isCalculatingHash = true;
        hashError = null;
        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const hashResult = blake2b256(bytes);
            updateHash(uint8ArrayToHex(hashResult));
        } catch (err: any) {
            console.error("Error calculating hash from file:", err);
            hashError = err?.message || "Failed to calculate hash from file";
        } finally {
            isCalculatingHash = false;
            input.value = ""; // Reset input
        }
    }

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
            updateHash("");
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

    {#if addError || hashError}
        <div class="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4">
            <p class="text-sm text-red-200">{addError || hashError}</p>
        </div>
    {/if}

    <div class="space-y-4">
        <div>
            <Label for="source-url">Source URL</Label>
            <div class="flex gap-2">
                <Textarea
                    id="source-url"
                    bind:value={newSourceUrl}
                    placeholder="https://example.com/file.zip or ipfs://... or magnet:..."
                    rows={2}
                    class="font-mono text-sm"
                    disabled={!hasProfile || isCalculatingHash}
                />
                <Button
                    variant="outline"
                    size="icon"
                    class="flex-shrink-0 h-auto"
                    on:click={calculateHashFromUrl}
                    disabled={!hasProfile ||
                        isCalculatingHash ||
                        !newSourceUrl.trim()}
                    title="Calculate hash from URL"
                >
                    {#if isCalculatingHash}
                        <Loader2 class="w-4 h-4 animate-spin" />
                    {:else}
                        <Download class="w-4 h-4" />
                    {/if}
                </Button>
            </div>
            <p class="text-xs text-muted-foreground mt-1">
                HTTP(S) URL, IPFS CID, Magnet link, or any download source.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label for="file-hash">File Hash (Blake2b256)</Label>
                <Input
                    type="text"
                    id="file-hash"
                    value={newFileHash}
                    on:input={(e) => updateHash(e.currentTarget.value)}
                    placeholder="64-character hexadecimal hash"
                    class="font-mono text-sm"
                    disabled={!hasProfile || isCalculatingHash}
                />
                <p class="text-xs text-muted-foreground mt-1">
                    Unique identifier for the file.
                </p>
            </div>

            <div>
                <Label>Upload File to Hash</Label>
                <div class="relative">
                    <input
                        type="file"
                        id="file-upload"
                        class="hidden"
                        on:change={handleFileUpload}
                        disabled={!hasProfile || isCalculatingHash}
                    />
                    <Button
                        variant="outline"
                        class="w-full"
                        on:click={() =>
                            document.getElementById("file-upload")?.click()}
                        disabled={!hasProfile || isCalculatingHash}
                    >
                        {#if isCalculatingHash}
                            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                            Calculating...
                        {:else}
                            <Upload class="w-4 h-4 mr-2" />
                            Select File
                        {/if}
                    </Button>
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                    Calculate hash from a local file.
                </p>
            </div>
        </div>

        <Button
            on:click={handleAddSource}
            disabled={isAddingSource ||
                isCalculatingHash ||
                !hasProfile ||
                !newFileHash.trim() ||
                !newSourceUrl.trim()}
            class="w-full"
        >
            {isAddingSource ? "Adding Source..." : "Add Source"}
        </Button>
    </div>
</div>
