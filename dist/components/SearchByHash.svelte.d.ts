import { SvelteComponent } from "svelte";
import { type FileSource, type InvalidFileSource, type UnavailableSource } from "../ergo/sourceObject";
import { type CachedData } from "../ergo/sourceObject";
import { type ReputationProof } from "../ergo/object";
declare const __propDef: {
    props: {
        hasProfile?: boolean;
        reputationProof?: ReputationProof | null;
        explorerUri: string;
        webExplorerUriTkn: string;
        fileSources?: CachedData<FileSource[]>;
        invalidFileSources?: CachedData<InvalidFileSource[]>;
        unavailableSources?: CachedData<UnavailableSource[]>;
        isLoading?: boolean;
        currentSearchHash?: string;
        onSearch: (hash: string) => void;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type SearchByHashProps = typeof __propDef.props;
export type SearchByHashEvents = typeof __propDef.events;
export type SearchByHashSlots = typeof __propDef.slots;
export default class SearchByHash extends SvelteComponent<SearchByHashProps, SearchByHashEvents, SearchByHashSlots> {
}
export {};
