import { SvelteComponent } from "svelte";
import type { FileSource, InvalidFileSource, UnavailableSource, ProfileOpinion } from "../ergo/sourceObject";
import type { ReputationProof } from "../ergo/object";
import type { CachedData } from "../ergo/sourceObject";
declare const __propDef: {
    props: {
        connected?: boolean;
        hasProfile?: boolean;
        reputationProof?: ReputationProof | null;
        explorerUri: string;
        webExplorerUriTkn: string;
        webExplorerUriTx: string;
        fileSources?: CachedData<FileSource[]>;
        invalidFileSources?: CachedData<InvalidFileSource[]>;
        unavailableSources?: CachedData<UnavailableSource[]>;
        profileOpinions?: CachedData<ProfileOpinion[]>;
        profileOpinionsGiven?: CachedData<ProfileOpinion[]>;
        profileInvalidations?: CachedData<InvalidFileSource[]>;
        profileUnavailabilities?: CachedData<UnavailableSource[]>;
        isLoading?: boolean;
        onLoadProfile: (tokenId: string) => void;
        onLoadFile: (hash: string) => void;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ProfileSourcesProps = typeof __propDef.props;
export type ProfileSourcesEvents = typeof __propDef.events;
export type ProfileSourcesSlots = typeof __propDef.slots;
export default class ProfileSources extends SvelteComponent<ProfileSourcesProps, ProfileSourcesEvents, ProfileSourcesSlots> {
}
export {};
