<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import Theme from "./Theme.svelte";
	import {
		address,
		connected,
		balance,
		network,
		reputation_proof,
	} from "$lib/ergo/store";
	import { explorer_uri, web_explorer_uri_tx } from "$lib/ergo/envs";
	import { User, Settings } from "lucide-svelte";
	import { get } from "svelte/store";
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import ProfileModal from "$lib/components/ProfileModal.svelte";
	import { fetchProfile } from "$lib/ergo/profileFetch";
	import { createProfileBox } from "$lib/ergo/sourceStore";
	import ProfileSources from "$lib/components/ProfileSources.svelte";
	import SearchByHash from "$lib/components/SearchByHash.svelte";
	import AddSource from "$lib/components/AddSource.svelte";
	import { Search, Plus, UserPlus, LayoutGrid } from "lucide-svelte";
	import { Button } from "$lib/components/ui/button/index.js";

	export let connect_executed = false;

	let current_height = 0;

	let profile_creation_tx = "";

	let balanceUpdateInterval: any;

	let showProfileModal = false;
	let showSettingsModal = false;

	let activeTab: "profile" | "search" | "add" = "profile";
	let isCreatingProfile = false;
	let addError: string | null = null;

	$: hasProfile =
		$reputation_proof !== null &&
		$reputation_proof?.current_boxes?.length > 0;

	// Footer text
	const footerMessages = [
		"Decentralized file discovery and verification on Ergo blockchain.",
		"Your reputation belongs to you. Verify sources, build trust.",
		"Powered by Ergo for transparency and immutability.",
	];
	let activeMessageIndex = 0;
	let scrollingTextElement: HTMLElement;

	function handleAnimationIteration() {
		activeMessageIndex = (activeMessageIndex + 1) % footerMessages.length;
	}

	async function get_current_height(): Promise<number> {
		try {
			return await ergo.get_current_height();
		} catch {
			try {
				const response = await fetch(
					get(explorer_uri) + "/api/v1/networkState",
				);
				if (!response.ok)
					throw new Error(`API request failed: ${response.status}`);
				const data = await response.json();
				return data.height;
			} catch (error) {
				console.error("Could not get network height from API:", error);
				throw new Error("Cannot get current height.");
			}
		}
	}

	async function get_balance(): Promise<Map<string, number>> {
		const balanceMap = new Map<string, number>();
		const addr = await ergo.get_change_address();
		if (!addr)
			throw new Error("An address is required to get the balance.");

		const response = await fetch(
			get(explorer_uri) + `/api/v1/addresses/${addr}/balance/confirmed`,
		);
		const data = await response.json();
		balanceMap.set("ERG", data.nanoErgs);
		balance.set(data.nanoErgs);
		data.tokens.forEach((token: { tokenId: string; amount: number }) => {
			balanceMap.set(token.tokenId, token.amount);
		});
		return balanceMap;
	}

	async function connectWallet() {
		if (typeof ergoConnector !== "undefined" && !connect_executed) {
			connect_executed = true;
			console.log("Connect wallet");
			const nautilus = ergoConnector.nautilus;
			if (nautilus && (await nautilus.connect())) {
				address.set(await ergo.get_change_address());
				network.set("ergo-mainnet");
				await get_balance();
				connected.set(true);
			} else {
				alert("Wallet not connected or unavailable");
			}
		}
	}

	async function loadUserProfile() {
		try {
			await fetchProfile(ergo);
			console.log("Profile loaded:", $reputation_proof);
		} catch (err) {
			console.error("Error loading profile:", err);
		}
	}

	onMount(() => {
		if (!browser) return;

		const init = async () => {
			await connectWallet();
		};
		init();

		balanceUpdateInterval = setInterval(updateWalletInfo, 30000);
		scrollingTextElement?.addEventListener(
			"animationiteration",
			handleAnimationIteration,
		);

		return () => {
			if (balanceUpdateInterval) clearInterval(balanceUpdateInterval);
			scrollingTextElement?.removeEventListener(
				"animationiteration",
				handleAnimationIteration,
			);
		};
	});

	connected.subscribe(async (isConnected) => {
		if (isConnected) {
			await updateWalletInfo();
			await loadUserProfile();
		}
	});

	async function updateWalletInfo() {
		if (typeof ergo === "undefined" || !$connected) return;
		try {
			const walletBalance = await get_balance();
			balance.set(walletBalance.get("ERG") || 0);
			current_height = await get_current_height();
		} catch (error) {
			console.error("Error updating wallet information:", error);
		}
	}

	async function handleCreateProfile() {
		isCreatingProfile = true;
		addError = null;
		try {
			await createProfileBox();
		} catch (err: any) {
			console.error("Error creating profile:", err);
			addError = err?.message || "Failed to create profile";
		} finally {
			isCreatingProfile = false;
		}
	}

	$: ergInErgs = $balance ? (Number($balance) / 1_000_000_000).toFixed(4) : 0;
</script>

<!-- HEADER -->
<div class="navbar-container">
	<div class="navbar-content">
		<a href="/" class="logo-container">Source Verification</a>

		<div class="flex items-center gap-1 ml-4">
			<button
				class="tab-button {activeTab === 'profile' ? 'active' : ''}"
				on:click={() => (activeTab = "profile")}
			>
				<User class="w-4 h-4" />
				Profile
			</button>
			<button
				class="tab-button {activeTab === 'search' ? 'active' : ''}"
				on:click={() => (activeTab = "search")}
			>
				<Search class="w-4 h-4" />
				Search
			</button>
			<button
				class="tab-button {activeTab === 'add' ? 'active' : ''}"
				on:click={() => (activeTab = "add")}
			>
				<Plus class="w-4 h-4" />
				Add
			</button>
		</div>

		<div class="flex-1"></div>

		<button
			class="user-icon"
			on:click={() => (showSettingsModal = true)}
			aria-label="Settings"
		>
			<Settings class="w-6 h-6" />
		</button>

		<button
			class="user-icon"
			on:click={() => (showProfileModal = true)}
			aria-label="Open profile"
		>
			<User class="w-6 h-6" />
		</button>
		<div class="theme-toggle"><Theme /></div>
	</div>
</div>

<SettingsModal bind:show={showSettingsModal} />
<ProfileModal bind:show={showProfileModal} bind:profile_creation_tx />

<main class="container mx-auto px-4 py-8 pb-20">
	<div class="max-w-6xl mx-auto">
		{#if !connected}
			<div
				class="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-center mb-6"
			>
				<p class="text-amber-200">
					Connect your wallet to use the Source Verification system
				</p>
			</div>
		{:else if !hasProfile}
			<div class="bg-card p-4 rounded-lg border mb-6">
				<h4 class="font-semibold mb-2">Create Your Profile</h4>
				<p class="text-sm text-muted-foreground mb-3">
					You need to create a profile before adding sources or
					voting. This is a one-time blockchain transaction.
				</p>
				<Button
					on:click={handleCreateProfile}
					disabled={isCreatingProfile}
					class="w-full"
				>
					<UserPlus class="w-4 h-4 mr-2" />
					{isCreatingProfile
						? "Creating Profile..."
						: "Create Profile (One-time)"}
				</Button>
			</div>
		{/if}

		{#if addError}
			<div
				class="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4"
			>
				<p class="text-sm text-red-200">{addError}</p>
			</div>
		{/if}

		{#if activeTab === "profile"}
			<ProfileSources connected={$connected} {hasProfile} />
		{:else if activeTab === "search"}
			<SearchByHash {hasProfile} />
		{:else if activeTab === "add"}
			<AddSource {hasProfile} />
		{/if}
	</div>
</main>

<footer class="page-footer">
	<div class="footer-center">
		<div bind:this={scrollingTextElement} class="scrolling-text-wrapper">
			{footerMessages[activeMessageIndex]}
		</div>
	</div>
</footer>

<style lang="postcss">
	.navbar-container {
		@apply sticky top-0 z-50 w-full border-b backdrop-blur-lg;
		background-color: hsl(var(--background) / 0.8);
		border-bottom-color: hsl(var(--border));
	}

	.navbar-content {
		@apply container flex h-16 items-center gap-4;
	}

	.user-icon {
		@apply p-2 rounded-full hover:bg-accent;
	}

	.tab-button {
		@apply px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-md hover:text-foreground hover:bg-accent/50 transition-all flex items-center gap-2;
	}

	.tab-button.active {
		@apply text-primary bg-primary/10 font-semibold;
	}

	.page-footer {
		@apply fixed bottom-0 left-0 right-0 z-40 flex items-center h-12 px-6 border-t text-sm text-muted-foreground;
		background-color: hsl(var(--background) / 0.8);
		backdrop-filter: blur(4px);
	}

	.footer-center {
		@apply flex-1 overflow-hidden;
		-webkit-mask-image: linear-gradient(
			to right,
			transparent,
			black 10%,
			black 90%,
			transparent
		);
		mask-image: linear-gradient(
			to right,
			transparent,
			black 10%,
			black 90%,
			transparent
		);
	}

	.scrolling-text-wrapper {
		@apply inline-block whitespace-nowrap;
		animation: scroll-left 15s linear infinite;
	}

	@keyframes scroll-left {
		from {
			transform: translateX(100vw);
		}
		to {
			transform: translateX(-100%);
		}
	}
</style>
