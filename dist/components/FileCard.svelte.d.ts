import { SvelteComponent } from "svelte";
import { type FileSource, type InvalidFileSource, type UnavailableSource } from "../ergo/sourceObject";
import { type ReputationProof } from "../ergo/object";
import { type CachedData } from "../ergo/sourceObject";
declare const __propDef: {
    props: {
        fileHash: string;
        profile?: ReputationProof | null;
        sources?: FileSource[];
        invalidFileSources?: CachedData<InvalidFileSource[]>;
        unavailableSources?: CachedData<UnavailableSource[]>;
        isLoading?: boolean;
        explorerUri: string;
        webExplorerUriTkn: string;
        class?: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type FileCardProps = typeof __propDef.props;
export type FileCardEvents = typeof __propDef.events;
export type FileCardSlots = typeof __propDef.slots;
export default class FileCard extends SvelteComponent<FileCardProps, FileCardEvents, FileCardSlots> {
}
export {};
