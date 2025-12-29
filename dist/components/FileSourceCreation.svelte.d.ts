import { SvelteComponent } from "svelte";
import { type ReputationProof } from "../ergo/object";
import { type Writable } from "svelte/store";
declare const __propDef: {
    props: {
        profile?: ReputationProof | null;
        explorerUri: string;
        onSourceAdded?: ((txId: string) => void) | null;
        hash?: Writable<string> | undefined;
        title?: string;
        class?: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type FileSourceCreationProps = typeof __propDef.props;
export type FileSourceCreationEvents = typeof __propDef.events;
export type FileSourceCreationSlots = typeof __propDef.slots;
export default class FileSourceCreation extends SvelteComponent<FileSourceCreationProps, FileSourceCreationEvents, FileSourceCreationSlots> {
}
export {};
