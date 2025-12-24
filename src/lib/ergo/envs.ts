import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const network_id: "mainnet" | "testnet" = "mainnet";

const default_explorer_uri = (network_id == "mainnet") ? "https://api.ergoplatform.com" : "https://api-testnet.ergoplatform.com";
const default_web_tx = (network_id == "mainnet") ? "https://sigmaspace.io/en/transaction/" : "https://testnet.ergoplatform.com/transactions/";
const default_web_addr = (network_id == "mainnet") ? "https://sigmaspace.io/en/address/" : "https://testnet.ergoplatform.com/addresses/";
const default_web_tkn = (network_id == "mainnet") ? "https://sigmaspace.io/en/token/" : "https://testnet.ergoplatform.com/tokens/";

function createPersistedStore(key: string, startValue: string) {
    const { subscribe, set, update } = writable(startValue);

    if (browser) {
        const stored = localStorage.getItem(key);
        if (stored) {
            set(stored);
        }
        subscribe(current => {
            localStorage.setItem(key, current);
        });
    }

    return {
        subscribe,
        set,
        update
    };
}

export const explorer_uri = createPersistedStore('explorer_uri', default_explorer_uri);
export const web_explorer_uri_tx = createPersistedStore('web_explorer_uri_tx', default_web_tx);
export const web_explorer_uri_addr = createPersistedStore('web_explorer_uri_addr', default_web_addr);
export const web_explorer_uri_tkn = createPersistedStore('web_explorer_uri_tkn', default_web_tkn);

// Profile Type NFT (unchanged)
export const PROFILE_TYPE_NFT_ID = "1820fd428a0b92d61ce3f86cd98240fdeeee8a392900f0b19a2e017d66f79926";
export const PROFILE_TOTAL_SUPPLY = 99999999;

// Source Application Type NFT IDs (PLACEHOLDER - replace with actual NFT IDs)
export const FILE_SOURCE_TYPE_NFT_ID = "8299d98e15ebee7fa39ad716de7c8bb191790a1bf4b7c3f91af35a0e36187706";
export const INVALID_FILE_SOURCE_TYPE_NFT_ID = "0000000000000000000000000000000000000000000000000000000000000002";
export const UNAVAILABLE_SOURCE_TYPE_NFT_ID = "0000000000000000000000000000000000000000000000000000000000000003";
export const PROFILE_OPINION_TYPE_NFT_ID = "0000000000000000000000000000000000000000000000000000000000000004";

// Deprecated
export const SOURCE_OPINION_TYPE_NFT_ID = "0000000000000000000000000000000000000000000000000000000000000005";