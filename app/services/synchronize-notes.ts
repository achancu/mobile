import _ from "lodash";
import * as ActionTypes from "../store/actions";
import * as MutationTypes from "../store/mutations";
import { Store } from "../store/types";
import PortalInterface from "./portal-interface";
import { Notes } from "../store/modules/notes";
import { serializePromiseChain } from "../utilities";

class MergedNotes {
    constructor(public readonly patch: PatchPortalNotes, public readonly modified: boolean) {}
}

export default class SynchronizeNotes {
    constructor(private readonly portal: PortalInterface, private readonly store: Store) {
        this.portal = portal;
        this.store = store;
    }

    public synchronize(ids: Ids) {
        return this.portal.getStationNotes(ids.portal).then((portalNotes: PortalStationNotesReply) => {
            const mobileNotes = this.store.state.notes.stations[ids.mobile] || new Notes(ids.mobile, new Date(), new Date());

            return this.media(ids, portalNotes, mobileNotes).then((resolvedMedia) => {
                console.log("uploaded", resolvedMedia);

                const merged = this.merge(ids, portalNotes, mobileNotes, resolvedMedia);
                const patch = merged.patch;

                return this.patchPortal(ids, patch).then((reply) => {
                    if (merged.modified) {
                        console.log("mobile notes modified");
                        return this.store.dispatch(ActionTypes.SAVE_NOTES, { stationId: ids.mobile });
                    }
                    return Promise.resolve();
                });
            });
        });
    }

    private patchPortal(ids: Ids, patch: PatchPortalNotes) {
        console.log("patching", ids, patch);
        if (patch.creating.length == 0 && patch.notes.length == 0) {
            return Promise.resolve();
        }
        return this.portal.updateStationNotes(ids.portal, patch);
    }

    private getFileName(path: string): string {
        const name = _.last(path.split("/"));
        if (!name) {
            throw new Error(`error getting file name: ${path}`);
        }
        return name;
    }

    private media(ids: Ids, portalNotes: PortalStationNotesReply, mobileNotes: Notes) {
        const allPortalMedia = [...portalNotes.media, ..._.flatten(portalNotes.notes.map((n) => n.media))];
        const portalByKey = _.keyBy(allPortalMedia, (m) => m.key);

        const allLocalMedia = mobileNotes.allMedia();
        const localByKey = _.keyBy(allLocalMedia, (m) => this.getFileName(m.path));

        console.log("ids", ids);
        console.log("portal", portalByKey);
        console.log("local", localByKey);

        return serializePromiseChain(_.keys(localByKey), (key) => {
            if (portalByKey[key]) {
                return [localByKey[key].path, portalByKey[key].id];
            }
            const path = localByKey[key].path;
            const contentType = "application/octet-stream";
            return this.portal.uploadStationMedia(ids.portal, key, contentType, path).then((response) => {
                if (response.status != 200) {
                    return Promise.reject(new Error("error uploading media"));
                }
                console.log("upload done", response);
                return [path, response.data.id];
            });
        }).then((pathAndId) => {
            console.log("media paths and ids", pathAndId);
            return _.fromPairs(pathAndId);
        });
    }

    private merge(ids: Ids, portalNotes: PortalStationNotesReply, mobileNotes: Notes, media: { [index: string]: number }): MergedNotes {
        const portalExisting = _.keyBy(portalNotes.notes, (n) => n.key);
        const localByKey = {
            studyObjective: mobileNotes.studyObjective,
            sitePurpose: mobileNotes.sitePurpose,
            siteCriteria: mobileNotes.siteCriteria,
            siteDescription: mobileNotes.siteDescription,
        };

        const modifications = _(localByKey)
            .mapValues((value, key) => {
                const photoIds = value.photos.map((m) => media[m.path]).filter((v) => v);
                const audioIds = value.audio.map((m) => media[m.path]).filter((v) => v);
                const mediaIds = [...photoIds, ...audioIds];

                if (portalExisting[key]) {
                    const portalUpdatedAt = new Date(portalExisting[key].updatedAt);
                    const localEmpty = value.body.length == 0;
                    console.log("comparing", key, localEmpty, portalUpdatedAt, mobileNotes.updatedAt);
                    if (localEmpty || portalUpdatedAt > mobileNotes.updatedAt) {
                        console.log("portal wins", key);
                        this.store.commit(MutationTypes.UPDATE_NOTE, { stationId: ids.mobile, key: key, update: portalExisting[key] });
                        return {
                            creating: null,
                            updating: null,
                        };
                    }
                    console.log("mobile wins", key);
                    return {
                        creating: null,
                        updating: new ExistingFieldNote(portalExisting[key].id, key, value.body, mediaIds),
                    };
                }
                return {
                    creating: new NewFieldNote(key, value.body, mediaIds),
                    updating: null,
                };
            })
            .values()
            .value();

        const creating = modifications.map((v) => v.creating).filter((v) => v !== null && v.body.length > 0) as NewFieldNote[];
        const updating = modifications.map((v) => v.updating).filter((v) => v !== null) as ExistingFieldNote[];
        const modified = this.store.state.notes.stations[ids.mobile]?.modified || false;

        return new MergedNotes(new PatchPortalNotes(creating, updating), modified);
    }
}

export class ExistingFieldNote {
    constructor(
        public readonly id: number,
        public readonly key: string,
        public readonly body: string,
        public readonly mediaIds: number[]
    ) {}
}

export class NewFieldNote {
    constructor(public readonly key: string, public readonly body: string, public readonly mediaIds: number[]) {}
}

export class Ids {
    constructor(public readonly mobile: number, public readonly portal: number) {}
}

export interface PortalStationNotes {
    id: number;
    createdAt: number;
    updatedAt: number;
    version: number;
    author: { id: number; name: number };
    key: string;
    body: string;
    media: { id: number; key: string; url: string; contentType: string }[];
}

export interface PortalNoteMedia {
    id: number;
    contentType: string;
    url: string;
    key: string;
}

export interface PortalStationNotesReply {
    media: PortalNoteMedia[];
    notes: PortalStationNotes[];
}

export class PatchPortalNotes {
    constructor(public readonly creating: NewFieldNote[], public readonly notes: ExistingFieldNote[]) {}
}

export interface PortalPatchNotesPayload {
    notes: PatchPortalNotes[];
}
