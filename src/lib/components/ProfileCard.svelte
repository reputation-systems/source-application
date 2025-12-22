<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { User, Copy, Wallet } from "lucide-svelte";
    import { createProfileBox } from "$lib/ergo/sourceStore";
    import { reputation_proof } from "$lib/ergo/store";
    import { address } from "ergo-reputation-system";

    // Props for island mode
    export let profile: any = null;
    export let onProfileCreated: ((txId: string) => void) | null = null;

    let isCreating = false;

    // Use reactive statements to sync with stores if not in island mode
    $: if (!profile && $reputation_proof) {
        profile = $reputation_proof;
    }

    async function handleCreateProfile() {
        isCreating = true;
        try {
            const tx = await createProfileBox();
            console.log("Profile created, tx:", tx);
            if (onProfileCreated) {
                onProfileCreated(tx);
            }
        } catch (err: any) {
            console.error("Error creating profile:", err);
        } finally {
            isCreating = false;
        }
    }

    function copyToClipboard(text: string) {
        if (!text) return;
        navigator.clipboard.writeText(text);
    }
</script>

<div class="bg-card p-6 rounded-lg border">
    {#if profile}
        <div class="space-y-6">
            <!-- Profile Header -->
            <div class="flex items-center gap-3 mb-4">
                <div
                    class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"
                >
                    <User class="w-6 h-6 text-primary" />
                </div>
                <h2 class="text-xl font-bold">Your Profile</h2>
            </div>

            <!-- Profile Info -->
            <div class="space-y-3">
                <!-- Profile Token ID -->
                <div class="p-4 bg-muted/50 rounded-lg border border-border">
                    <div class="flex justify-between items-start gap-4">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <User class="w-4 h-4 text-muted-foreground" />
                                <span
                                    class="text-xs font-medium text-muted-foreground"
                                    >Profile Token ID</span
                                >
                            </div>
                            <p
                                class="font-mono text-xs break-all text-foreground"
                            >
                                {profile.token_id}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="flex-shrink-0"
                            on:click={() => copyToClipboard(profile.token_id)}
                            disabled={!profile.token_id}
                        >
                            <Copy class="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <!-- Owner Address -->
                <div class="p-4 bg-muted/50 rounded-lg border border-border">
                    <div class="flex justify-between items-start gap-4">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <Wallet class="w-4 h-4 text-muted-foreground" />
                                <span
                                    class="text-xs font-medium text-muted-foreground"
                                    >Owner Address</span
                                >
                            </div>
                            <p
                                class="font-mono text-xs break-all text-foreground"
                            >
                                {profile.owner_address || $address || "N/A"}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="flex-shrink-0"
                            on:click={() =>
                                copyToClipboard(
                                    profile.owner_address || $address,
                                )}
                            disabled={!profile.owner_address && !$address}
                        >
                            <Copy class="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <!-- Reputation Amount -->
                <div class="p-4 bg-muted/50 rounded-lg border border-border">
                    <div class="text-sm">
                        <span class="text-muted-foreground">Total Reputation:</span>
                        <span class="font-semibold ml-2"
                            >{profile.total_amount?.toLocaleString() || "0"}</span
                        >
                    </div>
                    <div class="text-sm mt-2">
                        <span class="text-muted-foreground">Number of Boxes:</span>
                        <span class="font-semibold ml-2"
                            >{profile.number_of_boxes || 0}</span
                        >
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <!-- No Profile - Create One -->
        <div class="text-center py-8 space-y-4">
            <div
                class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"
            >
                <User class="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-semibold">No Profile Found</h3>
            <p class="text-sm text-muted-foreground max-w-md mx-auto">
                You need a reputation profile to participate in the Source
                Application. Create one now to get started.
            </p>
            <Button
                on:click={handleCreateProfile}
                disabled={isCreating}
                class="mx-auto"
            >
                {isCreating ? "Creating Profile..." : "Create Reputation Profile"}
            </Button>
        </div>
    {/if}
</div>
