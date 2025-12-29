import { writable } from 'svelte/store';
import { network_id } from './envs';
export const address = writable(null);
export const network = writable(null);
export const connected = writable(false);
export const balance = writable(null);
// App logic stores
export const compute_deep_level = writable(5);
export const searchStore = writable(null);
export const data_store = writable(null);
export const types = writable(new Map());
// Main store for holding fetched reputation proofs, keyed by token ID.
export const proofs = writable(new Map());
export const reputation_proof = writable(null);
// --- SOURCE STORES ---
const default_explorer_uri = (network_id == "mainnet") ? "https://api.ergoplatform.com" : "https://api-testnet.ergoplatform.com";
const default_web_tx = (network_id == "mainnet") ? "https://sigmaspace.io/en/transaction/" : "https://testnet.ergoplatform.com/transactions/";
const default_web_addr = (network_id == "mainnet") ? "https://sigmaspace.io/en/address/" : "https://testnet.ergoplatform.com/addresses/";
const default_web_tkn = (network_id == "mainnet") ? "https://sigmaspace.io/en/token/" : "https://testnet.ergoplatform.com/tokens/";
function createPersistedStringStore(key, startValue) {
    const isBrowser = typeof window !== 'undefined';
    let initial = startValue;
    if (isBrowser) {
        const stored = localStorage.getItem(key);
        if (stored)
            initial = stored;
    }
    const { subscribe, set, update } = writable(initial);
    return {
        subscribe,
        set: (value) => {
            if (isBrowser)
                localStorage.setItem(key, value);
            set(value);
        },
        update
    };
}
export const explorer_uri = createPersistedStringStore('explorer_uri', default_explorer_uri);
export const web_explorer_uri_tx = createPersistedStringStore('web_explorer_uri_tx', default_web_tx);
export const web_explorer_uri_addr = createPersistedStringStore('web_explorer_uri_addr', default_web_addr);
export const web_explorer_uri_tkn = createPersistedStringStore('web_explorer_uri_tkn', default_web_tkn);
// --- CACHE CONFIGURATION ---
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
/**
 * Helper to create a writable store that persists to localStorage.
 */
export function createPersistentStore(key, initialValue) {
    const isBrowser = typeof window !== 'undefined';
    let initial = initialValue;
    if (isBrowser) {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                initial = JSON.parse(saved);
            }
        }
        catch (e) {
            console.warn(`Error loading ${key} from localStorage:`, e);
        }
    }
    const { subscribe, set, update } = writable(initial);
    return {
        subscribe,
        set: (value) => {
            if (isBrowser)
                localStorage.setItem(key, JSON.stringify(value));
            set(value);
        },
        update: (fn) => {
            update(current => {
                const newValue = fn(current);
                if (isBrowser)
                    localStorage.setItem(key, JSON.stringify(newValue));
                return newValue;
            });
        }
    };
}
export const fileSources = createPersistentStore('source_file_sources', {});
export const currentSearchHash = writable("");
export const invalidFileSources = createPersistentStore('source_invalidations', {});
export const unavailableSources = createPersistentStore('source_unavailabilities', {});
export const profileOpinions = createPersistentStore('source_profile_opinions', {});
export const profileInvalidations = createPersistentStore('source_profile_invalidations', {});
export const profileUnavailabilities = createPersistentStore('source_profile_unavailabilities', {});
export const profileOpinionsGiven = createPersistentStore('source_profile_opinions_given', {});
export const isLoading = writable(false);
export const error = writable(null);
