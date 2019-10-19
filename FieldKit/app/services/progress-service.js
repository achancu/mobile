import { Observable } from "tns-core-modules/data/observable";
import { BetterObservable } from "./rx";
import Config from "../config";

const log = Config.logger("Progress");

class ProgressTracker {
    constructor(service, kind) {
        this.service = service;
        this.kind = kind;
        this.finished = false;
        this.progress = {
            message: null,
            progress: 0.0
        };
    }

    update(progress) {
        if (this.finished) {
            return;
        }
        this.progress = progress;
        this.service._publish(this, progress);
        return Promise.resolve();
    }

    cancel(error) {
        if (this.finished) {
            return;
        }
        log.info("cancel");
        this.finished = true;
        this.service.publish({ complete: true, cancel: true, progress: 100 });
        this.service._remove(this);
        return Promise.reject(error);
    }

    complete() {
        if (this.finished) {
            return;
        }
        log.info("complete");
        this.finished = true;
        this.service.publish({ complete: true, cancel: false, progress: 100 });
        this.service._remove(this);
        return Promise.resolve();
    }
}

const Kinds = {
    DOWNLOAD: "DOWNLOAD",
    UPLOAD: "UPLOAD"
};

export default class ProgressService extends BetterObservable {
    constructor() {
        super();
        this.active = [];
    }

    startOperation(kind) {
        const op = new ProgressTracker(this, kind);
        this.active.push(op);
        return op;
    }

    startDownload() {
        return this.startOperation(Kinds.DOWNLOAD);
    }

    startUpload() {
        return this.startOperation(Kinds.UPLOAD);
    }

    _remove(operation) {
        const index = this.active.indexOf(operation);
        if (index >= 0) {
            this.active.splice(index, 1);
            this._publish();
        } else {
            console.warn("Removing operation twice?");
        }
    }

    _publish(operation) {
        this.publish(this._calculateProgress());
    }

    _calculateProgress() {
        if (this.active.length == 1) {
            return {
                ...{},
                ...this.active[0].progress,
                ...{ message: this._getMessage(this.active[0].kind) }
            };
        } else {
            log.info("active", this.active);
        }
        return {
            message: null,
            progress: 0.0
        };
    }

    _getMessage(kind) {
        if (kind == Kinds.DOWNLOAD) {
            return "Downloading";
        }
        if (kind == Kinds.UPLOAD) {
            return "Uploading";
        }
        return "Working";
    }
}
