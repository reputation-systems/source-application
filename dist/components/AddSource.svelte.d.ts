import { SvelteComponent } from "svelte";
import { type ReputationProof } from "../ergo/object";
declare const __propDef: {
    props: {
        hasProfile?: boolean;
        profile?: ReputationProof | null;
        explorerUri?: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type AddSourceProps = typeof __propDef.props;
export type AddSourceEvents = typeof __propDef.events;
export type AddSourceSlots = typeof __propDef.slots;
export default class AddSource extends SvelteComponent<AddSourceProps, AddSourceEvents, AddSourceSlots> {
}
export {};
