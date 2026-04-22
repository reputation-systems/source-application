import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ProfileCardProps = typeof __propDef.props;
export type ProfileCardEvents = typeof __propDef.events;
export type ProfileCardSlots = typeof __propDef.slots;
export default class ProfileCard extends SvelteComponent<ProfileCardProps, ProfileCardEvents, ProfileCardSlots> {
}
export {};
