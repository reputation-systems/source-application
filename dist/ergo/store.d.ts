import { type FileSource, type InvalidFileSource, type UnavailableSource, type ProfileOpinion, type CachedData } from './sourceObject';
export declare const address: import("svelte/store").Writable<string | null>;
export declare const network: import("svelte/store").Writable<string | null>;
export declare const connected: import("svelte/store").Writable<boolean>;
export declare const balance: import("svelte/store").Writable<number | null>;
export declare const compute_deep_level: import("svelte/store").Writable<number>;
export declare const searchStore: import("svelte/store").Writable<string | null>;
export declare const data_store: import("svelte/store").Writable<any>;
export declare const types: import("svelte/store").Writable<Map<string, TypeNFT>>;
export declare const proofs: import("svelte/store").Writable<Map<string, ReputationProof>>;
export declare const reputation_proof: import("svelte/store").Writable<any>;
export declare const explorer_uri: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const web_explorer_uri_tx: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const web_explorer_uri_addr: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const web_explorer_uri_tkn: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const CACHE_DURATION: number;
/**
 * Helper to create a writable store that persists to localStorage.
 */
export declare function createPersistentStore<T>(key: string, initialValue: T): {
    subscribe: (this: void, run: import("svelte/store").Subscriber<T>, invalidate?: import("svelte/store").Invalidator<T> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: T) => void;
    update: (fn: (value: T) => T) => void;
};
export declare const fileSources: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<CachedData<FileSource[]>>, invalidate?: import("svelte/store").Invalidator<CachedData<FileSource[]>> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: CachedData<FileSource[]>) => void;
    update: (fn: (value: CachedData<FileSource[]>) => CachedData<FileSource[]>) => void;
};
export declare const currentSearchHash: import("svelte/store").Writable<string>;
export declare const invalidFileSources: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<CachedData<InvalidFileSource[]>>, invalidate?: import("svelte/store").Invalidator<CachedData<InvalidFileSource[]>> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: CachedData<InvalidFileSource[]>) => void;
    update: (fn: (value: CachedData<InvalidFileSource[]>) => CachedData<InvalidFileSource[]>) => void;
};
export declare const unavailableSources: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<CachedData<UnavailableSource[]>>, invalidate?: import("svelte/store").Invalidator<CachedData<UnavailableSource[]>> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: CachedData<UnavailableSource[]>) => void;
    update: (fn: (value: CachedData<UnavailableSource[]>) => CachedData<UnavailableSource[]>) => void;
};
export declare const profileOpinions: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<CachedData<ProfileOpinion[]>>, invalidate?: import("svelte/store").Invalidator<CachedData<ProfileOpinion[]>> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: CachedData<ProfileOpinion[]>) => void;
    update: (fn: (value: CachedData<ProfileOpinion[]>) => CachedData<ProfileOpinion[]>) => void;
};
export declare const profileInvalidations: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<CachedData<InvalidFileSource[]>>, invalidate?: import("svelte/store").Invalidator<CachedData<InvalidFileSource[]>> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: CachedData<InvalidFileSource[]>) => void;
    update: (fn: (value: CachedData<InvalidFileSource[]>) => CachedData<InvalidFileSource[]>) => void;
};
export declare const profileUnavailabilities: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<CachedData<UnavailableSource[]>>, invalidate?: import("svelte/store").Invalidator<CachedData<UnavailableSource[]>> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: CachedData<UnavailableSource[]>) => void;
    update: (fn: (value: CachedData<UnavailableSource[]>) => CachedData<UnavailableSource[]>) => void;
};
export declare const profileOpinionsGiven: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<CachedData<ProfileOpinion[]>>, invalidate?: import("svelte/store").Invalidator<CachedData<ProfileOpinion[]>> | undefined) => import("svelte/store").Unsubscriber;
    set: (value: CachedData<ProfileOpinion[]>) => void;
    update: (fn: (value: CachedData<ProfileOpinion[]>) => CachedData<ProfileOpinion[]>) => void;
};
export declare const isLoading: import("svelte/store").Writable<boolean>;
export declare const error: import("svelte/store").Writable<string | null>;
