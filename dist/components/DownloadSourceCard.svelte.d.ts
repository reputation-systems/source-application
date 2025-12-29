import { SvelteComponent } from "svelte";
import { type DownloadSourceGroup } from "../ergo/sourceObject";
import { type ReputationProof } from "../ergo/object";
import { type FileSource } from "../ergo/sourceObject";
declare const __propDef: {
    props: {
        group: DownloadSourceGroup;
        userProfileTokenId?: string | null;
        fileHash: string;
        reputationProof?: ReputationProof | null;
        explorerUri: string;
        currentSources?: FileSource[];
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type DownloadSourceCardProps = typeof __propDef.props;
export type DownloadSourceCardEvents = typeof __propDef.events;
export type DownloadSourceCardSlots = typeof __propDef.slots;
export default class DownloadSourceCard extends SvelteComponent<DownloadSourceCardProps, DownloadSourceCardEvents, DownloadSourceCardSlots> {
}
export {};
