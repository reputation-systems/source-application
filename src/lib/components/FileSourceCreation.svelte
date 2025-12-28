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
    import { type Writable } from "svelte/store";

    // Props for island mode
    export let profile: ReputationProof | null = null;
    export let explorerUri: string;
    export let onSourceAdded: ((txId: string) => void) | null = null;
    export let hash: Writable<string> | undefined = undefined;

    export let title: string = "Add New File Source";
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
    let urlMismatch = false;

    // Reactive value for the current hash from the store
    $: currentHashValue = (hash ? $hash : "") || "";
    $: isHashFixed = currentHashValue !== "";

    // Sync newFileHash with store
    $: if (hash && $hash) {
        newFileHash = $hash;
    }

    $: if (newSourceUrl) {
        urlMismatch = false;
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
        urlMismatch = false;
        try {
            const response = await fetch(newSourceUrl.trim());
            if (!response.ok)
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const hashResult = uint8ArrayToHex(blake2b256(bytes));

            if (isHashFixed && hashResult !== currentHashValue) {
                urlMismatch = true;
                hashError = `Calculated hash (${hashResult}) does not match the expected hash (${currentHashValue})`;
            } else {
                updateHash(hashResult);
            }
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
        if (!newSourceUrl.trim() || !profile) return;

        // If hash is fixed but not yet validated (or mismatch), we should validate it now
        if (isHashFixed && !urlMismatch && newFileHash !== currentHashValue) {
            // This case shouldn't happen if sync is working, but let's be safe
            newFileHash = currentHashValue;
        }

        // If it's fixed, we MUST validate the URL content before adding
        if (isHashFixed) {
            isCalculatingHash = true;
            hashError = null;
            try {
                const response = await fetch(newSourceUrl.trim());
                if (!response.ok)
                    throw new Error(
                        `Failed to fetch file: ${response.statusText}`,
                    );
                const buffer = await response.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                const hashResult = uint8ArrayToHex(blake2b256(bytes));

                if (hashResult !== currentHashValue) {
                    urlMismatch = true;
                    hashError = `Calculated hash (${hashResult}) does not match the expected hash (${currentHashValue})`;
                    isCalculatingHash = false;
                    return;
                }
            } catch (err: any) {
                console.error("Error validating URL:", err);
                hashError = err?.message || "Failed to validate URL";
                isCalculatingHash = false;
                return;
            } finally {
                isCalculatingHash = false;
            }
        }

        if (!newFileHash.trim() || urlMismatch) return;

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
            if (!isHashFixed) {
                updateHash("");
            }
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
    <h3 class="text-xl font-semibold mb-1">{title}</h3>
    <div class="mb-4">
        {#if newFileHash}
            <div class="text-xs font-mono text-muted-foreground break-all">
                <span class="font-semibold text-primary/70">Hash:</span>
                {newFileHash}
            </div>
        {:else}
            <div class="text-xs text-muted-foreground italic">
                No hash selected
            </div>
        {/if}
    </div>

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
                {#if !isHashFixed}
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
                {/if}
            </div>
            <p class="text-xs text-muted-foreground mt-1">
                HTTP(S) URL, IPFS CID, Magnet link, or any download source.
            </p>
        </div>

        {#if !isHashFixed}
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
        {/if}

        <Button
            on:click={handleAddSource}
            disabled={isAddingSource ||
                isCalculatingHash ||
                !hasProfile ||
                !newFileHash.trim() ||
                !newSourceUrl.trim()}
            class="w-full"
        >
            {#if isAddingSource}
                <Loader2 class="w-4 h-4 mr-2 animate-spin inline" />
                Adding Source...
            {:else if isCalculatingHash}
                <Loader2 class="w-4 h-4 mr-2 animate-spin inline" />
                Validating URL...
            {:else}
                Add Source
            {/if}
        </Button>
    </div>
</div>
