import { Downloader } from 'nativescript-downloader';
import { Folder, path, File, knownFolders } from "tns-core-modules/file-system";

import Config from '../config';

function log() {
    if (Config.logging.downloading) {
        console.log.apply(console, arguments);
    }
}

export default class StateManager {
    constructor(databaseInterface, queryStation, stationMonitor) {
        this.databaseInterface = databaseInterface;
        this.queryStation = queryStation;
        this.stationMonitor = stationMonitor;

        // NOTE Can we set these on our instance?
        Downloader.init();
        Downloader.setTimeout(120);
        this.downloader = new Downloader();
    }

    renameStation(station, newName) {
        return this.databaseInterface.setStationName(station).then(() => {
            return this.queryStation.configureName(station.url, newName);
        });
    }

    synchronizeConnectedStations() {
        log("synchronizeConnectedStations");
        return Promise.resolve(this._createServiceModel()).then(connectedStations => {
            log("connected", connectedStations);
            // NOTE Right now this will download concurrently, we may want to make this serialized.
            return Promise.all(connectedStations.map(s => {
                return this._prepare(s).then(() => {
                    return this._synchronizeStation(s);
                });
            }))
        });
    }

    _prepare(station) {
        log("deleting", station.paths.main);
        // TODO This will eventually be less aggressive.
        return station.paths.main.clear();
    }

    _synchronizeStation(station) {
        return Promise.resolve(station).then(station => {
            return this._download(station.meta.url, station.meta.staging).then(metaInfo => {
                return this._download(station.data.url, station.data.staging).then(dataInfo => {
                    return {
                        meta: metaInfo,
                        data: dataInfo,
                    };
                });
            }).then(infos => {
                log("unstage");
                return this._unstage(station, station.meta, infos).then(() => {
                    return this._unstage(station, station.data, infos);
                }).then(() => {
                    return infos;
                });
            }).then(incoming => {
                // TODO Move this to the database.
                return this._updateIndex(station, incoming);
            }).then(() => {
                log("done");
            });
        });
    }

    _updateIndex(station, incoming) {
        console.log("incoming", incoming)
        const newIndex = JSON.stringify(incoming);
        return station.paths.index.writeText(newIndex, "utf8");
    }

    _unstage(station, fileServiceModel, info) {
        log("rename", fileServiceModel.final.path);
        return fileServiceModel.staging.rename(fileServiceModel.final.name);
    }

    _download(url, destination) {
        log("download", url, "to", destination);

        const transfer = this.downloader.createDownload({
            url: url,
            path: destination.parent.path,
            fileName: destination.name
        });

        return new Promise((resolve, reject) => {
            this.downloader
                .start(transfer, progress => {
                    log("progress", progress);
                }, headers => {
                    log("headers", headers);
                })
                .then(completed => {
                    // TODO TODO TODO TODO TODO
                    const res = {
                        size: destination.size,
                        headers: {
                            FKSync: "0,100",
                        }
                    };
                    resolve(res);
                })
                .catch(error => {
                    log("error", error.message);
                    reject(error);
                });
        });
    }

    _createServiceModel() {
        return this.stationMonitor.getStations().filter(s => {
            return s.deviceId && s.url && s.connected;
        }).map(s => {
            const main = this._getStationFolder(s);
            const staging = this._getStagingFolder(s);
            const destinationMeta = main.getFile("meta.fkpb");
            const destinationData = main.getFile("data.fkpb");

            // NOTE NativeScript rename is dumb, gotta keep them in the same directory.
            function toFileModel(urlPath, name) {
                return {
                    url: s.url + urlPath,
                    staging: main.getFile("." + name),
                    final: main.getFile(name),
                };
            }

            return {
                deviceId: s.deviceId,
                url: s.url,
                paths: {
                    main: main,
                    staging: staging,
                    index: main.getFile("index.json"),
                },
                meta: toFileModel("/download/meta", "meta.fkpb"),
                data: toFileModel("/download/data", "data.fkpb"),
            };
        });
    }

    _getStationFolder(station) {
        const data = knownFolders.currentApp();
        return data.getFolder(station.deviceId);
    }


    _getStagingFolder(station) {
        return this._getStationFolder(station).getFolder(".staging");
    }
}
