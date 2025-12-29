import { SvelteComponent } from "svelte";
import { type ProfileSourceGroup, type InvalidFileSource, type UnavailableSource } from "../ergo/sourceObject";
import { type CachedData } from "../ergo/sourceObject";
declare const __propDef: {
    props: {
        group: ProfileSourceGroup;
        invalidFileSources?: CachedData<InvalidFileSource[]>;
        unavailableSources?: CachedData<UnavailableSource[]>;
        webExplorerUriTkn: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ProfileSourceGroupProps = typeof __propDef.props;
export type ProfileSourceGroupEvents = typeof __propDef.events;
export type ProfileSourceGroupSlots = typeof __propDef.slots;
export default class ProfileSourceGroup extends SvelteComponent<ProfileSourceGroupProps, ProfileSourceGroupEvents, ProfileSourceGroupSlots> {
}
export {};
