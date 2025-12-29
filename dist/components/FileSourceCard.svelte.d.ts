import { SvelteComponent } from "svelte";
import { type FileSource, type InvalidFileSource, type UnavailableSource } from "../ergo/sourceObject";
import { type ReputationProof } from "../ergo/object";
declare const __propDef: {
    props: {
        source: FileSource;
        confirmations?: FileSource[];
        invalidations?: InvalidFileSource[];
        unavailabilities?: UnavailableSource[];
        profile?: ReputationProof | null;
        explorerUri: string;
        webExplorerUriTx: string;
        webExplorerUriTkn: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type FileSourceCardProps = typeof __propDef.props;
export type FileSourceCardEvents = typeof __propDef.events;
export type FileSourceCardSlots = typeof __propDef.slots;
export default class FileSourceCard extends SvelteComponent<FileSourceCardProps, FileSourceCardEvents, FileSourceCardSlots> {
}
export {};
