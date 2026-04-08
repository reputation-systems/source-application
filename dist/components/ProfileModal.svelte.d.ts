import { SvelteComponent } from "svelte";
import { type ReputationProof } from "../ergo/object";
declare const __propDef: {
    props: {
        show?: boolean;
        profile_creation_tx?: string;
        address?: string | null;
        profile?: ReputationProof | null;
        webExplorerUriTx: string;
        explorerUri: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ProfileModalProps = typeof __propDef.props;
export type ProfileModalEvents = typeof __propDef.events;
export type ProfileModalSlots = typeof __propDef.slots;
export default class ProfileModal extends SvelteComponent<ProfileModalProps, ProfileModalEvents, ProfileModalSlots> {
}
export {};
