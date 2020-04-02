import _ from "lodash";
import { Observable } from "tns-core-modules/data/observable";
import { BetterObservable } from "./rx";

import DownloadManager from "./download-manager";
import UploadManager from "./upload-manager";
import Config from "../config";

const log = Config.logger("StateManager");

export default class StateManager extends BetterObservable {
    constructor(services) {
        super();
        this.databaseInterface = services.Database();
        this.queryStation = services.QueryStation();
        this.stationMonitor = services.StationMonitor();
        this.portalInterface = services.PortalInterface();
        this.downloadManager = new DownloadManager(services);
        this.uploadManager = new UploadManager(services);
        this.stationMonitor.on(Observable.propertyChangeEvent, data => {
            switch (data.propertyName.toString()) {
                case this.stationMonitor.StationRefreshedProperty: {
                    log.info(this.stationMonitor.StationRefreshedProperty, data);
                    this.refresh();
                    break;
                }
            }
        });
    }

    renameStation(station, newName) {
        return this.databaseInterface.setStationName(station).then(() => {
            return this.queryStation.configureName(station.url, newName);
        });
    }

    synchronizeStation(deviceId) {
        log.info("synchronizeStation");
        return this.downloadManager.startSynchronizeStation(deviceId).then(() => {
            return this.refresh();
        });
    }

    synchronizePortal() {
        log.info("synchronizePortal");
        return this.uploadManager.synchronizePortal().then(() => {
            return this.refresh();
        });
    }

    getStatus() {
        return Promise.all([this.downloadManager.getStatus(), this.uploadManager.getStatus()]).then(all => {
            return {
                station: all[0],
                portal: all[1],
            };
        });
    }

    getValue() {
        return this.getStatus();
    }

    refreshSyncStatus(station) {
        if (this.portalInterface.isLoggedIn()) {
            return this.portalInterface
                .getStationSyncState(station.deviceId)
                .then(summary => {
                    return this.databaseInterface.updateStationFromPortal(station, summary).then(status => {
                        log.info(status);
                    });
                })
                .catch(error => {
                    log.error("error", error);
                });
        }
        return Promise.reject();
    }
}
