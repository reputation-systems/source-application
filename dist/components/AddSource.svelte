<script>import { addFileSource } from "../ergo/sourceStore";
import {} from "../ergo/sourceObject";
import {} from "../ergo/object";
import { Button } from "./ui/button/index.js";
import { Input } from "./ui/input/index.js";
import { Label } from "./ui/label/index.js";
import { Textarea } from "./ui/textarea";
import { AlertTriangle } from "lucide-svelte";
import { HASH_OPTIONS, validateHash } from "../ergo/hashUtils";
export let hasProfile = false;
export let profile = null;
export let explorerUri = "";
let newFileHash = "";
let newSourceUrl = "";
let isAddingSource = false;
let addError = null;
let hashSelectValue = "";
let customHashFunctionId = "";
$:
  effectiveAlgorithm = hashSelectValue === "__custom__" ? customHashFunctionId : hashSelectValue;
let fileHashValidationError = null;
$: {
  if (newFileHash.trim() && hashSelectValue) {
    fileHashValidationError = validateHash(newFileHash.trim(), hashSelectValue === "__custom__" ? "__custom__" : hashSelectValue);
  } else {
    fileHashValidationError = null;
  }
}
async function handleAddSource() {
  if (!newFileHash.trim() || !newSourceUrl.trim())
    return;
  if (fileHashValidationError)
    return;
  isAddingSource = true;
  addError = null;
  try {
    const entry = {
      hashFunctionId: "",
      contentFormat: "",
      contentHash: "",
      rawFormat: "",
      urlLink: newSourceUrl.trim()
    };
    const tx = await addFileSource(
      newFileHash.trim(),
      effectiveAlgorithm,
      entry,
      profile,
      explorerUri
    );
    console.log("Source added, tx:", tx);
    newFileHash = "";
    newSourceUrl = "";
    hashSelectValue = "";
    customHashFunctionId = "";
  } catch (err) {
    console.error("Error adding source:", err);
    addError = err?.message || "Failed to add source";
  } finally {
    isAddingSource = false;
  }
}
</script>

<div class="bg-card p-6 rounded-lg border mb-6">
    <h3 class="text-xl font-semibold mb-4">Add New File Source</h3>

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

    {#if addError}
        <div class="bg-red-500/10 border border-red-600 dark:border-red-500/20 p-3 rounded-lg mb-4">
            <p class="text-sm text-red-800 dark:text-red-200">{addError}</p>
        </div>
    {/if}

    <div class="space-y-4">
        <div>
            <Label for="file-hash">File Hash</Label>
            <Input
                type="text"
                id="file-hash"
                bind:value={newFileHash}
                placeholder="64-character hexadecimal hash"
                class="font-mono text-sm {fileHashValidationError ? 'border-red-500' : ''}"
                disabled={!hasProfile}
            />
            {#if fileHashValidationError}
                <p class="text-xs text-red-500 mt-1">{fileHashValidationError}</p>
            {:else}
                <p class="text-xs text-muted-foreground mt-1">
                    This is the unique identifier for the file. Users will search by
                    this hash.
                </p>
            {/if}
        </div>

        <div>
            <Label for="hash-algo">Hash Algorithm</Label>
            <select
                id="hash-algo"
                bind:value={hashSelectValue}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                disabled={!hasProfile}
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
                    disabled={!hasProfile}
                />
            {/if}
        </div>

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
                !newSourceUrl.trim() ||
                !!fileHashValidationError}
            class="w-full"
        >
            {isAddingSource ? "Adding Source..." : "Add Source"}
        </Button>
    </div>
</div>
