import { SvelteComponent } from "svelte";
import type { TimelineEvent } from "../ergo/sourceObject";
declare const __propDef: {
    props: {
        events?: TimelineEvent[];
        title?: string;
        webExplorerUriTkn?: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type TimelineProps = typeof __propDef.props;
export type TimelineEvents = typeof __propDef.events;
export type TimelineSlots = typeof __propDef.slots;
export default class Timeline extends SvelteComponent<TimelineProps, TimelineEvents, TimelineSlots> {
}
export {};
