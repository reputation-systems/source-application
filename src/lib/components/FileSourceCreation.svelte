<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { addFileSource } from "$lib/ergo/sourceStore";
    import { type SourceEntry } from "$lib/ergo/sourceObject";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { AlertTriangle, Download, Upload, Loader2 } from "lucide-svelte";
    import { type ReputationProof } from "$lib/ergo/object";
    import { downloadAndHash } from "$lib/ergo/hashUtils";

    import { type Writable } from "svelte/store";
    import {
        HASH_ALGORITHM_IDS,
        HASH_OPTIONS,
        getAlgorithmLabel,
        normalizeHashAlgorithmId,
        validateHash,
    } from "$lib/ergo/hashUtils";

    // Props for island mode
    export let profile: ReputationProof | null = null;
    export let explorerUri: string;
    export let source_explorer_url: string;
    export let onSourceAdded: ((txId: string) => void) | null = null;
    export let hash: Writable<string> | undefined = undefined;
    export let fixedHashFunctionId: string = HASH_ALGORITHM_IDS.blake2b256;

    /** When false, skip automatic hash verification when adding a source. */
    export let hashValidationEnabled: boolean = false;

    export let title: string = "Add New File Source";
    let className: string = "";
    export { className as class };

    $: hasProfile = profile !== null && (profile.current_boxes?.length ?? 0) > 0;
    const baseClasses = "bg-card p-6 rounded-lg border";

    let newFileHash = "";
    let effectiveHashFunctionId = "";
    let isAddingSource = false;
    let addError: string | null = null;

    let isCalculatingHash = false;
    let hashError: string | null = null;
    let urlMismatch = false;

    // Single source entry form fields
    let entryHashFunctionId = "";
    let entryContentFormat = "";
    let entryContentHash = "";
    let entryRawFormat = "";
    let entryUrlLink = "";

    // Hash function dropdown
    let hashSelectValue = "";
    let customHashFunctionId = "";

    // Content equals raw toggle (Change #2)
    let contentEqualsRaw = true;

    // Chunked file support (Change #6)
    let isChunked = false;

    // Format type toggles (Change #7)
    let contentFormatType: "extension" | "formatId" = "extension";
    let rawFormatType: "extension" | "formatId" = "extension";

    // Hash validation errors (Change #1)
    let fileHashValidationError: string | null = null;
    let contentHashValidationError: string | null = null;
    let rawHashValidationError: string | null = null;

    $: effectiveHashFunctionId = isHashFixed
        ? normalizeHashAlgorithmId(fixedHashFunctionId.trim() || HASH_ALGORITHM_IDS.blake2b256)
        : (hashSelectValue === "__custom__" ? customHashFunctionId : hashSelectValue);

    // Validate file hash when it changes
    $: {
        if (newFileHash.trim() && effectiveHashFunctionId) {
            fileHashValidationError = validateHash(newFileHash.trim(), effectiveHashFunctionId);
        } else if (newFileHash.trim() && hashSelectValue === "__custom__" && customHashFunctionId) {
            fileHashValidationError = validateHash(newFileHash.trim(), "__custom__");
        } else {
            fileHashValidationError = null;
        }
    }

    // Validate content hash when it changes
    $: {
        if (entryContentHash.trim() && (entryHashFunctionId.trim() || effectiveHashFunctionId)) {
            contentHashValidationError = validateHash(
                entryContentHash.trim(),
                entryHashFunctionId.trim() || effectiveHashFunctionId,
            );
        } else {
            contentHashValidationError = null;
        }
    }

    // Validate raw hash when it changes (only when not hidden)
    $: {
        if (!contentEqualsRaw && entryRawFormat && entryHashFunctionId) {
            // Raw hash uses potentially a different algorithm — just validate hex/length generically
            rawHashValidationError = null; // raw hash has no specific algo constraint in this form
        } else {
            rawHashValidationError = null;
        }
    }

    // Reactive value for the current hash from the store
    $: currentHashValue = (hash ? $hash : "") || "";
    $: isHashFixed = currentHashValue !== "";

    // Sync newFileHash with store
    $: if (hash && $hash) {
        newFileHash = $hash;
    }

    // Check if the source entry has a URL
    $: hasValidEntry = entryUrlLink.trim() !== "";

    // Check if form has validation errors preventing submission
    $: hasValidationErrors = !!fileHashValidationError || !!contentHashValidationError;

    // Pre-fill form via URL parameters
    // Reads all supported params on mount (e.g. from external tool links).
    // URLSearchParams.get() already URL-decodes values.
    onMount(() => {
        const params = $page.url.searchParams;
        const pFileHash = params.get("fileHash");
        const pHashFunctionId = params.get("hashFunctionId");
        const pUrlLink = params.get("urlLink");
        const pContentFormat = params.get("contentFormat");
        const pContentHash = params.get("contentHash");
        const pRawFormat = params.get("rawFormat");
        const pRawHash = params.get("rawHash");
        const pIsChunked = params.get("isChunked");

        if (pFileHash) {
            updateHash(pFileHash);
        }

        if (pHashFunctionId) {
            // Match against known hash algorithms in the dropdown
            const normalizedHashFunctionId = normalizeHashAlgorithmId(pHashFunctionId);
            const knownOption = HASH_OPTIONS.find(
                (o) => o.value === normalizedHashFunctionId,
            );
            if (knownOption && knownOption.value !== "__custom__") {
                hashSelectValue = knownOption.value;
            } else {
                // Not a known short label — treat as custom hash function ID
                hashSelectValue = "__custom__";
                customHashFunctionId = pHashFunctionId;
            }
            // Also set the source entry hash function ID
            entryHashFunctionId = pHashFunctionId;
        }

        if (pUrlLink) entryUrlLink = pUrlLink;
        if (pContentFormat) entryContentFormat = pContentFormat;
        if (pContentHash) entryContentHash = pContentHash;
        if (pIsChunked === "true") isChunked = true;

        // If rawFormat or rawHash differ from content values, uncheck content=raw
        if (pRawFormat || pRawHash) {
            const rawDiffers = (pRawFormat && pRawFormat !== pContentFormat) ||
                               (pRawHash && pRawHash !== pContentHash);
            if (rawDiffers || pRawFormat || pRawHash) {
                contentEqualsRaw = false;
            }
            if (pRawFormat) entryRawFormat = pRawFormat;
        }
    });

    function updateHash(val: string) {
        newFileHash = val;
        if (hash) {
            hash.set(val);
        }
    }

    async function calculateHashFromUrl() {
        const url = entryUrlLink.trim();
        if (!url) return;

        const algorithmId = entryHashFunctionId || effectiveHashFunctionId;
        if (!algorithmId || algorithmId === '__custom__') {
            hashError = "Cannot verify: select a known hash algorithm first";
            return;
        }

        isCalculatingHash = true;
        hashError = null;
        urlMismatch = false;
        try {
            // downloadAndHash handles both chunked (manifest) and regular URLs
            // and uses the correct hash algorithm
            const hashResult = await downloadAndHash(url, algorithmId, isChunked);

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

        const algorithmId = entryHashFunctionId || effectiveHashFunctionId;
        if (!algorithmId || algorithmId === '__custom__') {
            hashError = "Cannot verify: select a known hash algorithm first";
            return;
        }

        const file = input.files[0];
        isCalculatingHash = true;
        hashError = null;
        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const { computeHash } = await import("$lib/ergo/hashUtils");
            const hashResult = computeHash(bytes, algorithmId);
            if (!hashResult) throw new Error(`Unsupported hash algorithm: ${algorithmId}`);
            updateHash(hashResult);
        } catch (err: any) {
            console.error("Error calculating hash from file:", err);
            hashError = err?.message || "Failed to calculate hash from file";
        } finally {
            isCalculatingHash = false;
            input.value = "";
        }
    }

    async function handleAddSource() {
        if (!hasValidEntry || !profile) return;
        if (hasValidationErrors) return;

        // If hash is fixed but not yet validated (or mismatch), we should validate it now
        if (isHashFixed && !urlMismatch && newFileHash !== currentHashValue) {
            newFileHash = currentHashValue;
        }

        // If hash validation is enabled and hash is fixed, validate the URL content before adding
        if (hashValidationEnabled && isHashFixed && entryUrlLink.trim()) {
            const algorithmId = entryHashFunctionId || effectiveHashFunctionId;
            if (!algorithmId || algorithmId === '__custom__') {
                hashError = "Cannot verify: select a known hash algorithm first";
                return;
            }
            isCalculatingHash = true;
            hashError = null;
            try {
                // Use downloadAndHash with correct algorithm + chunked support
                const hashResult = await downloadAndHash(entryUrlLink.trim(), algorithmId, isChunked);

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
            // Build single SourceEntry from form
            // When contentEqualsRaw is checked, auto-copy content values to raw
            const finalRawFormat = contentEqualsRaw ? entryContentFormat.trim() : entryRawFormat.trim();
            const finalRawHash = contentEqualsRaw ? entryContentHash.trim() : ""; // rawHash not a separate field

            const entry: SourceEntry = {
                hashFunctionId: normalizeHashAlgorithmId(
                    entryHashFunctionId.trim() || effectiveHashFunctionId.trim(),
                ),
                contentFormat: entryContentFormat.trim(),
                contentHash: entryContentHash.trim(),
                rawFormat: finalRawFormat,
                urlLink: entryUrlLink.trim(),
                isChunked: isChunked || undefined,
            };

            const tx = await addFileSource(
                newFileHash.trim(),
                effectiveHashFunctionId.trim(),
                entry,
                profile,
                explorerUri,
            );
            console.log("Source added, tx:", tx);
            if (!isHashFixed) {
                updateHash("");
            }
            hashSelectValue = "";
            customHashFunctionId = "";
            entryHashFunctionId = "";
            entryContentFormat = "";
            entryContentHash = "";
            entryRawFormat = "";
            entryUrlLink = "";
            contentEqualsRaw = true;
            isChunked = false;
            contentFormatType = "extension";
            rawFormatType = "extension";

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
                <a
                    href={`${source_explorer_url}?search=${newFileHash}`}
                    target="_blank"
                    class="hover:underline text-primary"
                >
                    {newFileHash}
                </a>
            </div>
        {:else}
            <div class="text-xs text-muted-foreground italic">
                No hash selected
            </div>
        {/if}
    </div>

    <div
        class="bg-amber-500/10 border border-amber-600 dark:border-amber-500/20 p-3 rounded-lg mb-4 flex gap-2"
    >
        <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-amber-800 dark:text-amber-200">
            <strong>Security Warning:</strong> Always verify URLs before downloading.
            Malicious actors may post harmful links. The URL you provide will be
            publicly visible and immutable on the blockchain.
        </div>
    </div>

    {#if addError || hashError}
        <div class="bg-red-500/10 border border-red-600 dark:border-red-500/20 p-3 rounded-lg mb-4">
            <p class="text-sm text-red-800 dark:text-red-200 break-all">
                {addError || hashError}
            </p>
        </div>
    {/if}

    <div class="space-y-4">
        {#if !isHashFixed}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label for="file-hash">Raw File Hash (R5 Anchor)</Label>
                    <Input
                        type="text"
                        id="file-hash"
                        value={newFileHash}
                        on:input={(e) => updateHash(e.currentTarget.value)}
                        placeholder="64-character hexadecimal hash"
                        class="font-mono text-sm {fileHashValidationError ? 'border-red-500' : ''}"
                        disabled={!hasProfile || isCalculatingHash}
                    />
                    {#if fileHashValidationError}
                        <p class="text-xs text-red-500 mt-1">{fileHashValidationError}</p>
                    {:else}
                        <p class="text-xs text-muted-foreground mt-1">
                            The raw file hash digest. Users search by this.
                        </p>
                    {/if}
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

        <div>
            <Label for="hash-function-id">Hash Function ID</Label>
            {#if isHashFixed}
                <Input
                    type="text"
                    id="hash-function-id"
                    value={effectiveHashFunctionId}
                    class="font-mono text-sm"
                    disabled
                />
                <p class="text-xs text-muted-foreground mt-1">
                    Fixed Hash Mode uses `{effectiveHashFunctionId}` ({getAlgorithmLabel(effectiveHashFunctionId)}) for the anchor hash.
                </p>
            {:else}
                <select
                    id="hash-function-id"
                    bind:value={hashSelectValue}
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    disabled={!hasProfile || isCalculatingHash}
                >
                    <option value="">Select hash function...</option>
                    {#each HASH_OPTIONS as opt}
                        <option value={opt.value}>{opt.label}{opt.value !== "__custom__" ? ` (${opt.value})` : ""}</option>
                    {/each}
                </select>
                {#if hashSelectValue === "__custom__"}
                    <Input
                        type="text"
                        bind:value={customHashFunctionId}
                        placeholder="Enter custom hash function identifier"
                        class="font-mono text-sm mt-2"
                        disabled={!hasProfile || isCalculatingHash}
                    />
                {/if}
                <p class="text-xs text-muted-foreground mt-1">
                    Identifies the hash algorithm used. Per convention: output of HASH(EMPTY_INPUT).
                </p>
            {/if}
        </div>

        <!-- Source Entry -->
        <div class="space-y-4">
            <Label class="text-base font-semibold">Source Entry</Label>

            <div class="border rounded-lg p-4 space-y-3 bg-background/50">
                <!-- Chunked file toggle (Change #6) -->
                <div class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is-chunked"
                        bind:checked={isChunked}
                        class="rounded border-input"
                        disabled={!hasProfile}
                    />
                    <Label for="is-chunked" class="text-sm font-normal cursor-pointer">
                        This is a chunked file (manifest URL)
                    </Label>
                </div>

                <div>
                    <Label for="url-link">{isChunked ? 'Manifest URL' : 'URL / Download Link'}</Label>
                    <div class="flex gap-2">
                        <Textarea
                            id="url-link"
                            bind:value={entryUrlLink}
                            placeholder={isChunked
                                ? "https://example.com/manifest (each line is a chunk URL)"
                                : "https://example.com/file.zip or ipfs://... or magnet:..."}
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
                                    !entryUrlLink.trim()}
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
                    {#if isChunked}
                        <p class="text-xs text-muted-foreground mt-1">
                            Plain text manifest (UTF-8). Each line is a URL to a chunk, in order.
                        </p>
                    {/if}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <Label for="entry-hash-fn">Hash Function ID</Label>
                        <Input
                            type="text"
                            id="entry-hash-fn"
                            bind:value={entryHashFunctionId}
                            placeholder={`Optional. Defaults to ${effectiveHashFunctionId}`}
                            class="font-mono text-xs"
                            disabled={!hasProfile}
                        />
                    </div>
                    <div>
                        <Label for="content-hash">Content Hash</Label>
                        <Input
                            type="text"
                            id="content-hash"
                            bind:value={entryContentHash}
                            placeholder="Hash of content at this URL"
                            class="font-mono text-xs {contentHashValidationError ? 'border-red-500' : ''}"
                            disabled={!hasProfile}
                        />
                        {#if contentHashValidationError}
                            <p class="text-xs text-red-500 mt-1">{contentHashValidationError}</p>
                        {/if}
                    </div>
                    <div>
                        <Label for="content-format">Content Format</Label>
                        <div class="flex items-center gap-2 mb-1">
                            <button
                                class="text-xs px-2 py-0.5 rounded {contentFormatType === 'extension' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}"
                                on:click={() => contentFormatType = 'extension'}
                            >Extension</button>
                            <button
                                class="text-xs px-2 py-0.5 rounded {contentFormatType === 'formatId' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}"
                                on:click={() => contentFormatType = 'formatId'}
                            >Format ID</button>
                        </div>
                        <Input
                            type="text"
                            id="content-format"
                            bind:value={entryContentFormat}
                            placeholder={contentFormatType === 'extension' ? '.tar.gz' : 'box_id_hash...'}
                            class="font-mono text-xs"
                            disabled={!hasProfile}
                        />
                    </div>

                    <!-- Content equals raw toggle (Change #2) -->
                    {#if !contentEqualsRaw}
                        <div>
                            <Label for="raw-format">Raw Format</Label>
                            <div class="flex items-center gap-2 mb-1">
                                <button
                                    class="text-xs px-2 py-0.5 rounded {rawFormatType === 'extension' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}"
                                    on:click={() => rawFormatType = 'extension'}
                                >Extension</button>
                                <button
                                    class="text-xs px-2 py-0.5 rounded {rawFormatType === 'formatId' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}"
                                    on:click={() => rawFormatType = 'formatId'}
                                >Format ID</button>
                            </div>
                            <Input
                                type="text"
                                id="raw-format"
                                bind:value={entryRawFormat}
                                placeholder={rawFormatType === 'extension' ? '.bin' : 'box_id_hash...'}
                                class="font-mono text-xs"
                                disabled={!hasProfile}
                            />
                        </div>
                    {/if}
                </div>

                <!-- Content equals raw checkbox (Change #2) -->
                <div class="flex items-center gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="content-equals-raw"
                        bind:checked={contentEqualsRaw}
                        class="rounded border-input"
                        disabled={!hasProfile}
                    />
                    <Label for="content-equals-raw" class="text-xs font-normal cursor-pointer text-muted-foreground">
                        Content is same as raw (no compression) — raw hash & format auto-copied from content
                    </Label>
                </div>
            </div>
        </div>

        <Button
            on:click={handleAddSource}
            disabled={isAddingSource ||
                isCalculatingHash ||
                !hasProfile ||
                !newFileHash.trim() ||
                !hasValidEntry ||
                hasValidationErrors}
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
