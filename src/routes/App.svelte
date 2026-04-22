<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import Theme from "./Theme.svelte";
	import {
		address,
		connected,
		balance,
		network,
		reputation_proof,
		fileSources,
		invalidFileSources,
		unavailableSources,
		profileOpinions,
		profileOpinionsGiven,
		profileInvalidations,
		profileUnavailabilities,
		isLoading,
		currentSearchHash,
		error,
		explorer_uri,
		web_explorer_uri_tx,
		web_explorer_uri_addr,
		web_explorer_uri_tkn,
		hashValidationEnabled,
	} from "$lib/ergo/store";
	import { PROFILE_TYPE_NFT_ID, ERGO_TREE_HASH } from "$lib/ergo/envs";
	import { User, Settings, Search, Plus, UserPlus } from "lucide-svelte";
	import { get, writable } from "svelte/store";
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import { fetchAllUserProfiles, fetchTypeNfts, convertToRPBox } from "reputation-system";
	import type { TypeNFT, ApiBox } from "reputation-system";
	import { createProfileBox } from "$lib/ergo/sourceStore";
	import { searchByHash, loadProfileData } from "$lib/ergo/sourceFetch";
	import ProfileSources from "$lib/components/ProfileSources.svelte";
	import SearchByHash from "$lib/components/SearchByHash.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import FileSourceCreation from "$lib/components/FileSourceCreation.svelte";
	import {
		WalletAddressChangeHandler,
		WalletButton,
		walletAddress,
		walletBalance,
		walletConnected,
	} from "wallet-svelte-component";

	let current_height = 0;
	let balanceUpdateInterval: any;
	let showSettingsModal = false;

	let activeTab: "profile" | "search" | "add" = "profile";
	let isCreatingProfile = false;
	let addError: string | null = null;
	let creationHashStore = writable("");

	$: hasProfile =
		$reputation_proof !== null &&
		$reputation_proof?.current_boxes?.length > 0;

	// Source Explorer URL - defaults to current origin
	$: source_explorer_url = $page.url.origin;

	// URL Synchronization
	$: {
		const profile = $page.url.searchParams.get("profile");
		const search = $page.url.searchParams.get("search");
		const tab = $page.url.searchParams.get("tab");

		if (profile) {
			activeTab = "profile";
		} else if (search) {
			activeTab = "search";
		} else if (tab === "add") {
			activeTab = "add";
		} else if (tab === "search") {
			activeTab = "search";
		} else if (tab === "profile") {
			activeTab = "profile";
		}
	}

	function switchTab(tab: "profile" | "search" | "add") {
		const url = new URL($page.url);
		url.searchParams.set("tab", tab);

		// Clear other params when switching tabs to avoid confusion
		if (tab !== "profile") url.searchParams.delete("profile");
		if (tab !== "search") url.searchParams.delete("search");

		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

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

	/**
	 * Decode a hex string to its UTF-8 text representation.
	 */
	function hexToUtf8(hex: string): string | null {
		try {
			if (hex.length % 2 !== 0) return null;
			const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
			return new TextDecoder('utf-8').decode(bytes);
		} catch { return null; }
	}

	/**
	 * Fallback profile detection that handles the R5 encoding issue.
	 *
	 * The reputation-system library compares parseCollByteToHex(R5.renderedValue)
	 * with the token ID for `is_self_defined` detection. However, profile boxes
	 * store R5 as the UTF-8 encoding of the token ID hex string (64 ASCII bytes)
	 * rather than the raw 32 bytes. This causes `parseCollByteToHex` to return
	 * the hex of the ASCII representation, which doesn't match the token ID.
	 *
	 * This fallback directly queries the explorer API for boxes matching the
	 * user's ErgoTree (R7), then checks both the raw hex and the UTF-8 decoded
	 * form of R5 to find self-referencing profile boxes.
	 */
	async function fallbackProfileDetection(
		explorerUri: string,
		availableTypes: Map<string, TypeNFT>
	): Promise<import('reputation-system').ReputationProof | null> {
		try {
			if (typeof ergo === 'undefined') return null;

			const { ErgoAddress, SColl, SByte } = await import('@fleet-sdk/core');
			const changeAddress = await ergo.get_change_address();
			if (!changeAddress) return null;

			const userAddress = ErgoAddress.fromBase58(changeAddress);

			// Build serialized R7 and strip type prefix for rendered form
			function hexToBytes(h: string): Uint8Array | null {
				if (!h || !/^[0-9a-fA-F]*$/.test(h) || h.length % 2 !== 0) return null;
				const arr = new Uint8Array(h.length / 2);
				for (let i = 0; i < arr.length; i++) arr[i] = parseInt(h.substring(i*2, i*2+2), 16);
				return arr;
			}

			const r7Serialized = SColl(SByte, userAddress.ergoTree).toHex();
			// Strip Coll[Byte] prefix (0e + length byte(s))
			const r7Rendered = r7Serialized.startsWith('0e') ? r7Serialized.substring(4) : r7Serialized;

			// Query the Explorer API for boxes matching our ergo tree and R7
			// Don't filter by R4 type — accept any profile type
			const ergo_tree_hash = ERGO_TREE_HASH;

			const allBoxes: ApiBox[] = [];
			let offset = 0;
			const limit = 100;
			let more = true;

			while (more) {
				const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
				const body = {
					ergoTreeTemplateHash: ergo_tree_hash,
					registers: {
						R7: r7Rendered,
					},
					assets: [],
				};

				const resp = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});

				if (!resp.ok) { more = false; continue; }
				const data = await resp.json();
				if (!data.items || data.items.length === 0) { more = false; continue; }
				allBoxes.push(...data.items);
				offset += limit;
				if (data.items.length < limit) more = false;
			}

			if (allBoxes.length === 0) return null;

			// Find profile (self-referencing) boxes
			// Check both raw hex and UTF-8 decoded forms of R5
			const profileBoxes = allBoxes.filter(box => {
				if (!box.assets?.length) return false;
				if (!box.additionalRegisters?.R5?.renderedValue) return false;
				if (!box.additionalRegisters?.R6) return false;

				// R6 must be false (unlocked)
				const r6 = box.additionalRegisters.R6.renderedValue;
				if (r6 !== "false") return false;

				const tokenId = box.assets[0].tokenId;
				const r5Rendered = box.additionalRegisters.R5.renderedValue as string;

				// Direct match: R5 rendered value equals token ID
				if (r5Rendered === tokenId) return true;

				// UTF-8 decode: R5 might be hex(utf8(tokenId))
				const decoded = hexToUtf8(r5Rendered);
				if (decoded === tokenId) return true;

				return false;
			});

			if (profileBoxes.length === 0) return null;

			// Group by token ID and build a ReputationProof for the first profile
			const tokenId = profileBoxes[0].assets[0].tokenId;

			// Fetch emission amount for this token
			let totalAmount = 0;
			try {
				const tokenResp = await fetch(`${explorerUri}/api/v1/tokens/${tokenId}`);
				if (tokenResp.ok) {
					const tokenData = await tokenResp.json();
					totalAmount = Number(tokenData.emissionAmount || 0);
				}
			} catch (e) {
				console.warn('Error fetching token emission amount:', e);
			}

			// Fetch ALL boxes for this token to build complete proof
			const allTokenBoxes: ApiBox[] = [];
			let tokenOffset = 0;
			let tokenMore = true;
			while (tokenMore) {
				const url = `${explorerUri}/api/v1/boxes/unspent/byTokenId/${tokenId}?offset=${tokenOffset}&limit=100`;
				try {
					const resp = await fetch(url);
					if (!resp.ok) { tokenMore = false; continue; }
					const data = await resp.json();
					if (!data.items || data.items.length === 0) { tokenMore = false; continue; }
					allTokenBoxes.push(...data.items);
					tokenOffset += 100;
					if (data.items.length < 100) tokenMore = false;
				} catch { tokenMore = false; }
			}

			// Build the ReputationProof
			const r7Val = profileBoxes[0].additionalRegisters.R7;
			const proof: import('reputation-system').ReputationProof = {
				token_id: tokenId,
				types: [],
				data: {},
				total_amount: totalAmount,
				owner_ergotree: (r7Val?.renderedValue as string) ?? '',
				owner_serialized: r7Val?.serializedValue ?? '',
				can_be_spend: true,
				current_boxes: [],
				number_of_boxes: 0,
				network: 'ergo',
			};

			const uniqueTypeIds = new Set<string>();
			for (const box of allTokenBoxes) {
				const rpbox = convertToRPBox(box, tokenId, availableTypes);
				if (rpbox) {
					proof.current_boxes.push(rpbox);
					proof.number_of_boxes += 1;

					// Check if this is a self-referencing box (profile type)
					// Handle both raw and UTF-8 encoded R5 values
					const r5Match = rpbox.object_pointer === tokenId
						|| hexToUtf8(rpbox.object_pointer) === tokenId;
					if (r5Match) {
						const typeId = rpbox.type.tokenId;
						if (!uniqueTypeIds.has(typeId)) {
							uniqueTypeIds.add(typeId);
							proof.types.push(rpbox.type);
						}
					}
				}
			}

			console.log('Fallback profile detection found proof:', proof);
			return proof;
		} catch (err) {
			console.error('Fallback profile detection error:', err);
			return null;
		}
	}

	async function loadUserProfile() {
		try {
			const types = await fetchTypeNfts(get(explorer_uri));

			// First try the library's standard profile detection
			// Pass empty array to accept any profile type (JUDGE, PROFILE, etc.)
			const proofs = await fetchAllUserProfiles(
				get(explorer_uri),
				true,
				[],
				types,
			);
			let proof = proofs[0];

			// If the library didn't find a profile, try the fallback detection
			// which handles the R5 UTF-8 encoding edge case
			if (!proof) {
				console.log('Standard profile detection found nothing, trying fallback...');
				proof = await fallbackProfileDetection(get(explorer_uri), types) ?? undefined as any;
			}

			console.log("Fetched profile proof:", proof);
			reputation_proof.set(proof ?? null);
			console.log("Profile loaded:", proof);
		} catch (err) {
			console.error("Error loading profile:", err);
		}
	}

	onMount(() => {
		if (!browser) return;

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

	let lastLoadedWalletAddress: string | null = null;

	$: connected.set($walletConnected);
	$: address.set($walletAddress || null);
	$: network.set($walletConnected ? "ergo-mainnet" : null);
	$: balance.set($walletConnected ? Number($walletBalance.nanoErgs) : null);

	$: if (browser && $walletConnected && $walletAddress && $walletAddress !== lastLoadedWalletAddress) {
		lastLoadedWalletAddress = $walletAddress;
		void updateWalletInfo();
		void loadUserProfile();
	}

	$: if (browser && !$walletConnected && lastLoadedWalletAddress !== null) {
		lastLoadedWalletAddress = null;
		reputation_proof.set(null);
	}

	async function updateWalletInfo() {
		if (!$walletConnected) return;
		try {
			balance.set(Number($walletBalance.nanoErgs));
			current_height = await get_current_height();
		} catch (error) {
			console.error("Error updating wallet information:", error);
		}
	}

	async function handleCreateProfile() {
		isCreatingProfile = true;
		addError = null;
		try {
			await createProfileBox(get(explorer_uri));
		} catch (err: any) {
			console.error("Error creating profile:", err);
			addError = err?.message || "Failed to create profile";
		} finally {
			isCreatingProfile = false;
		}
	}

	function handleSettingsSave(settings: {
		explorerUri: string;
		webTx: string;
		webAddr: string;
		webTkn: string;
		hashValidation: boolean;
	}) {
		explorer_uri.set(settings.explorerUri);
		web_explorer_uri_tx.set(settings.webTx);
		web_explorer_uri_addr.set(settings.webAddr);
		web_explorer_uri_tkn.set(settings.webTkn);
		hashValidationEnabled.set(settings.hashValidation);
	}

	// --- Centralized State Actions ---

	async function handleSearch(hash: string, _algorithm?: string) {
		if (!hash) return;
		isLoading.set(true);
		currentSearchHash.set(hash);
		try {
			const result = await searchByHash(hash, get(explorer_uri));

			fileSources.update((s) => ({
				...s,
				[hash]: { data: result.sources, timestamp: Date.now() },
			}));

			invalidFileSources.update((s) => {
				const newInvs = { ...s };
				for (const [id, invs] of Object.entries(result.invalidations)) {
					newInvs[id] = { data: invs, timestamp: Date.now() };
				}
				return newInvs;
			});

			unavailableSources.update((s) => {
				const newUnavs = { ...s };
				for (const [url, unavs] of Object.entries(
					result.unavailabilities,
				)) {
					newUnavs[url] = { data: unavs, timestamp: Date.now() };
				}
				return newUnavs;
			});
		} catch (e: any) {
			console.error("Search error:", e);
			error.set(e.message);
		} finally {
			isLoading.set(false);
		}
	}

	async function handleLoadProfile(tokenId: string) {
		if (!tokenId) return;
		isLoading.set(true);
		try {
			const data = await loadProfileData(tokenId, get(explorer_uri));

			fileSources.update((s) => ({
				...s,
				[tokenId]: { data: data.sources, timestamp: Date.now() },
			}));

			profileInvalidations.update((s) => ({
				...s,
				[tokenId]: { data: data.invalidations, timestamp: Date.now() },
			}));
			profileUnavailabilities.update((s) => ({
				...s,
				[tokenId]: {
					data: data.unavailabilities,
					timestamp: Date.now(),
				},
			}));
			profileOpinions.update((s) => ({
				...s,
				[tokenId]: { data: data.opinions, timestamp: Date.now() },
			}));
			profileOpinionsGiven.update((s) => ({
				...s,
				[tokenId]: { data: data.opinionsGiven, timestamp: Date.now() },
			}));
		} catch (e: any) {
			console.error("Load profile error:", e);
			error.set(e.message);
		} finally {
			isLoading.set(false);
		}
	}

	async function handleLoadFile(hash: string) {
		if (!hash) return;
		if (get(fileSources)[hash]) return;

		try {
			const result = await searchByHash(hash, get(explorer_uri));

			fileSources.update((s) => ({
				...s,
				[hash]: { data: result.sources, timestamp: Date.now() },
			}));

			invalidFileSources.update((s) => {
				const newInvs = { ...s };
				for (const [id, invs] of Object.entries(result.invalidations)) {
					newInvs[id] = { data: invs, timestamp: Date.now() };
				}
				return newInvs;
			});

			unavailableSources.update((s) => {
				const newUnavs = { ...s };
				for (const [url, unavs] of Object.entries(
					result.unavailabilities,
				)) {
					newUnavs[url] = { data: unavs, timestamp: Date.now() };
				}
				return newUnavs;
			});
		} catch (e) {
			console.error("Load file error:", e);
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
				on:click={() => switchTab("profile")}
			>
				<User class="w-4 h-4" />
				Profile
			</button>
			<button
				class="tab-button {activeTab === 'search' ? 'active' : ''}"
				on:click={() => switchTab("search")}
			>
				<Search class="w-4 h-4" />
				Search
			</button>
			<button
				class="tab-button {activeTab === 'add' ? 'active' : ''}"
				on:click={() => switchTab("add")}
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

		<div class="wallet-button-container">
			<WalletButton />
		</div>
		<div class="theme-toggle"><Theme /></div>
	</div>
</div>

<SettingsModal
	bind:show={showSettingsModal}
	explorerUri={$explorer_uri}
	webTx={$web_explorer_uri_tx}
	webAddr={$web_explorer_uri_addr}
	webTkn={$web_explorer_uri_tkn}
	hashValidation={$hashValidationEnabled}
	onSave={handleSettingsSave}
/>

<WalletAddressChangeHandler />

<main class="container mx-auto px-4 py-8 pb-20">
	<div class="max-w-6xl mx-auto">
		{#if !$connected}
			<div
				class="bg-amber-500/10 border border-amber-600 dark:border-amber-500/20 p-4 rounded-lg text-center mb-6"
			>
				<p class="text-amber-800 dark:text-amber-200">
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
				class="bg-red-500/10 border border-red-600 dark:border-red-500/20 p-3 rounded-lg mb-4"
			>
				<p class="text-sm text-red-800 dark:text-red-200">{addError}</p>
			</div>
		{/if}

		{#if activeTab === "profile"}
			<ProfileSources
				connected={$connected}
				{hasProfile}
				reputationProof={$reputation_proof}
				explorerUri={$explorer_uri}
				webExplorerUriTkn={$web_explorer_uri_tkn}
				webExplorerUriTx={$web_explorer_uri_tx}
				{source_explorer_url}
				fileSources={$fileSources}
				invalidFileSources={$invalidFileSources}
				unavailableSources={$unavailableSources}
				profileOpinions={$profileOpinions}
				profileOpinionsGiven={$profileOpinionsGiven}
				profileInvalidations={$profileInvalidations}
				profileUnavailabilities={$profileUnavailabilities}
				isLoading={$isLoading}
				onLoadProfile={handleLoadProfile}
				onLoadFile={handleLoadFile}
			/>
		{:else if activeTab === "search"}
			<SearchByHash
				{hasProfile}
				reputationProof={$reputation_proof}
				explorerUri={$explorer_uri}
				webExplorerUriTkn={$web_explorer_uri_tkn}
				{source_explorer_url}
				fileSources={$fileSources}
				invalidFileSources={$invalidFileSources}
				unavailableSources={$unavailableSources}
				isLoading={$isLoading}
				currentSearchHash={$currentSearchHash}
				onSearch={handleSearch}
			/>
		{:else if activeTab === "add"}
			<FileSourceCreation
				profile={$reputation_proof}
				explorerUri={$explorer_uri}
				{source_explorer_url}
				hash={creationHashStore}
				hashValidationEnabled={$hashValidationEnabled}
			/>
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

	.wallet-button-container {
		@apply flex items-center;
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
