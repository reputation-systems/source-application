import { writable } from 'svelte/store';
import { type ReputationProof, type TypeNFT } from 'ergo-reputation-system';
import { type FileSource, type InvalidFileSource, type UnavailableSource, type ProfileOpinion } from './sourceObject';

export const address = writable<string | null>(null);
export const network = writable<string | null>(null);
export const connected = writable<boolean>(false);
export const balance = writable<number | null>(null);

// App logic stores
export const compute_deep_level = writable<number>(5);
export const searchStore = writable<string | null>(null);
export const data_store = writable<any | null>(null);
export const types = writable<Map<string, TypeNFT>>(new Map());

// Main store for holding fetched reputation proofs, keyed by token ID.
export const proofs = writable<Map<string, ReputationProof>>(new Map());
export const reputation_proof = writable<ReputationProof | null>(null);

// --- SOURCE STORES ---

// --- CACHE CONFIGURATION ---
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export interface CachedData<T> {
    [key: string]: {
        data: T;
        timestamp: number;
    }
}

/**
 * Helper to create a writable store that persists to localStorage.
 */
export function createPersistentStore<T>(key: string, initialValue: T) {
    const isBrowser = typeof window !== 'undefined';
    let initial = initialValue;

    if (isBrowser) {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                initial = JSON.parse(saved);
            }
        } catch (e) {
            console.warn(`Error loading ${key} from localStorage:`, e);
        }
    }

    const { subscribe, set, update } = writable<T>(initial);

    return {
        subscribe,
        set: (value: T) => {
            if (isBrowser) localStorage.setItem(key, JSON.stringify(value));
            set(value);
        },
        update: (fn: (value: T) => T) => {
            update(current => {
                const newValue = fn(current);
                if (isBrowser) localStorage.setItem(key, JSON.stringify(newValue));
                return newValue;
            });
        }
    };
}

export const fileSources = createPersistentStore<CachedData<FileSource[]>>('source_file_sources', {});
export const currentSearchHash = writable<string>("");
export const invalidFileSources = createPersistentStore<CachedData<InvalidFileSource[]>>('source_invalidations', {});
export const unavailableSources = createPersistentStore<CachedData<UnavailableSource[]>>('source_unavailabilities', {});
export const profileOpinions = createPersistentStore<CachedData<ProfileOpinion[]>>('source_profile_opinions', {});
export const profileInvalidations = createPersistentStore<CachedData<InvalidFileSource[]>>('source_profile_invalidations', {});
export const profileUnavailabilities = createPersistentStore<CachedData<UnavailableSource[]>>('source_profile_unavailabilities', {});
export const profileOpinionsGiven = createPersistentStore<CachedData<ProfileOpinion[]>>('source_profile_opinions_given', {});
export const isLoading = writable<boolean>(false);
export const error = writable<string | null>(null);