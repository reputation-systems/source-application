<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { X, RotateCcw } from "lucide-svelte";

    export let show = false;
    export let explorerUri: string;
    export let webTx: string;
    export let webAddr: string;
    export let webTkn: string;
    export let onSave: (settings: {
        explorerUri: string;
        webTx: string;
        webAddr: string;
        webTkn: string;
    }) => void;

    // Valores por defecto definidos en constantes para fácil mantenimiento
    const DEFAULTS = {
        api: "https://api.ergoplatform.com",
        tx: "https://sigmaspace.io/en/transaction/",
        addr: "https://sigmaspace.io/en/address/",
        tkn: "https://sigmaspace.io/en/token/",
    };

    let localExplorerUri = explorerUri;
    let localWebTx = webTx;
    let localWebAddr = webAddr;
    let localWebTkn = webTkn;

    // Sync local state when props change (e.g. when modal opens)
    $: if (show) {
        localExplorerUri = explorerUri;
        localWebTx = webTx;
        localWebAddr = webAddr;
        localWebTkn = webTkn;
    }

    function close() {
        show = false;
    }

    function handleSave() {
        onSave({
            explorerUri: localExplorerUri,
            webTx: localWebTx,
            webAddr: localWebAddr,
            webTkn: localWebTkn,
        });
        close();
    }

    // Función para restaurar valores
    function restoreDefaults() {
        localExplorerUri = DEFAULTS.api;
        localWebTx = DEFAULTS.tx;
        localWebAddr = DEFAULTS.addr;
        localWebTkn = DEFAULTS.tkn;
    }
</script>

{#if show}
    <button class="modal-backdrop" on:click={close} aria-label="Close settings"
    ></button>

    <div class="modal" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold">Settings</h2>
            <Button variant="ghost" size="icon" on:click={close}>
                <X class="w-5 h-5" />
            </Button>
        </div>

        <div class="space-y-6">
            <div class="space-y-2">
                <Label for="explorer-api">Explorer API URI</Label>
                <div class="flex gap-2">
                    <Input
                        id="explorer-api"
                        bind:value={localExplorerUri}
                        placeholder={DEFAULTS.api}
                    />
                </div>
                <p class="text-xs text-muted-foreground">
                    The base URL for the Ergo Explorer API.
                </p>
            </div>

            <div class="space-y-2">
                <Label for="web-tx">Transaction Explorer URL</Label>
                <Input
                    id="web-tx"
                    bind:value={localWebTx}
                    placeholder={DEFAULTS.tx}
                />
                <p class="text-xs text-muted-foreground">
                    URL prefix for viewing transactions.
                </p>
            </div>

            <div class="space-y-2">
                <Label for="web-addr">Address Explorer URL</Label>
                <Input
                    id="web-addr"
                    bind:value={localWebAddr}
                    placeholder={DEFAULTS.addr}
                />
                <p class="text-xs text-muted-foreground">
                    URL prefix for viewing addresses.
                </p>
            </div>

            <div class="space-y-2">
                <Label for="web-tkn">Token Explorer URL</Label>
                <Input
                    id="web-tkn"
                    bind:value={localWebTkn}
                    placeholder={DEFAULTS.tkn}
                />
                <p class="text-xs text-muted-foreground">
                    URL prefix for viewing tokens.
                </p>
            </div>
        </div>

        <div
            class="mt-8 flex justify-between items-center pt-4 border-t border-border"
        >
            <Button
                variant="outline"
                size="sm"
                on:click={restoreDefaults}
                class="text-muted-foreground hover:text-foreground"
            >
                <RotateCcw class="w-4 h-4 mr-2" />
                Restore Defaults
            </Button>

            <Button on:click={handleSave}>Done</Button>
        </div>
    </div>
{/if}

<style lang="postcss">
    .modal-backdrop {
        /* Backdrop oscuro al 80% */
        @apply fixed inset-0 bg-black/80 z-[70] cursor-default backdrop-blur-sm;
    }

    .modal {
        /* - max-w-2xl: Más ancho.
           - bg-background: Color sólido del sistema (blanco en light, oscuro en dark) sin transparencia.
           - text-foreground: Color de texto correcto.
        */
        @apply fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        bg-background text-foreground border border-border rounded-xl p-6 w-full max-w-2xl z-[80] shadow-2xl;
    }
</style>
