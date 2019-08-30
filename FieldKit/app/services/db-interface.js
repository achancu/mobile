import Config from "../config";
import QueryStation from "./query-station";
import Sqlite from "../wrappers/sqlite";

const queryStation = new QueryStation();
const sqlite = new Sqlite();

// thirty seconds
const minInterval = 30;
// two weeks (in seconds)
const maxInterval = 1209600;

let databasePromise;

export default class DatabaseInterface {
    constructor() {
        databasePromise = this.openDatabase();
        this.databasePromise = databasePromise;
    }

    getDatabaseName() {
        if (TNS_ENV === "test") {
            return "test_fieldkit.sqlite3";
        }
        return "fieldkit.sqlite3";
    }

    openDatabase() {
        return sqlite.open(this.getDatabaseName()).then(db => {
            return (this.database = db);
        });
    }

    getDatabase() {
        return databasePromise;
    }

    getStationConfigs(stationId) {
        return this.getDatabase().then(db =>
            db.query("SELECT * FROM stations_config WHERE station_id = ?", [stationId])
        );
    }

    getModuleConfigs(moduleId) {
        return this.getDatabase().then(db =>
            db.query("SELECT * FROM modules_config WHERE module_id = ?", [moduleId])
        );
    }

    getDatabase() {
        return this.databasePromise;
    }

    getAll() {
        return this.getDatabase().then(db => db.query("SELECT * FROM stations"));
    }

    getStation(stationId) {
        return this.getDatabase().then(db => db.query("SELECT * FROM stations WHERE id = ?", [stationId]));
    }

    getModule(moduleId) {
        return this.getDatabase().then(db => db.query("SELECT * FROM modules WHERE id = ?", [moduleId]));
    }

    getModules(stationId) {
        return this.getDatabase().then(db =>
            db.query("SELECT * FROM modules WHERE station_id = ?", [stationId])
        );
    }

    getSensors(moduleId) {
        return this.getDatabase().then(db =>
            db.query("SELECT * FROM sensors WHERE module_id = ?", [moduleId])
        );
    }

    setStationName(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET name = ? WHERE id = ?", [station.name, station.id])
        );
    }

    setStationPortalID(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET portal_id = ? WHERE id = ?", [station.portalId, station.id])
        );
    }

    setStationLocationCoordinates(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET latitude = ?, longitude = ? WHERE id = ?", [
                station.latitude,
                station.longitude,
                station.id
            ])
        );
    }

    setStationLocationName(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET location_name = ? WHERE id = ?", [
                station.location_name,
                station.id
            ])
        );
    }

    setStationInterval(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET interval = ? WHERE id = ?", [station.interval, station.id])
        );
    }

    setStationDeployImage(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET deploy_image_name = ? WHERE id = ?", [
                station.deploy_image_name,
                station.id
            ])
        );
    }

    setStationDeployImageLabel(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET deploy_image_label = ? WHERE id = ?", [
                station.deploy_image_label,
                station.id
            ])
        );
    }

    setStationDeployNote(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET deploy_note = ? WHERE id = ?", [station.deploy_note, station.id])
        );
    }

    setStationDeployAudio(station) {
        return this.getDatabase().then(db =>
            db.query("UPDATE stations SET deploy_audio_files = ? WHERE id = ?", [
                station.deploy_audio_files,
                station.id
            ])
        );
    }

    setModuleName(module) {
        return this.getDatabase().then(db =>
            db.query("UPDATE modules SET name = ? WHERE id = ?", [module.name, module.id])
        );
    }

    setModuleInterval(module) {
        return this.getDatabase().then(db =>
            db.query("UPDATE modules SET interval = ? WHERE id = ?", [module.interval, module.id])
        );
    }

    setModuleGraphs(module) {
        return this.getDatabase().then(db =>
            db.query("UPDATE modules SET graphs = ? WHERE id = ?", [module.graphs, module.id])
        );
    }

    recordStationConfigChange(config) {
        return this.getDatabase().then(db =>
            db.query(
                "INSERT INTO stations_config (station_id, before, after, affected_field, author) VALUES (?, ?, ?, ?, ?)",
                [config.station_id, config.before, config.after, config.affected_field, config.author]
            )
        );
    }

    recordModuleConfigChange(config) {
        return this.getDatabase().then(db =>
            db.query(
                "INSERT INTO modules_config (module_id, before, after, affected_field, author) VALUES (?, ?, ?, ?, ?)",
                [config.module_id, config.before, config.after, config.affected_field, config.author]
            )
        );
    }

    checkForStation(address) {
        return queryStation.queryStatus(address).then(result => {
            const deviceId = new Buffer.from(result.status.identity.deviceId).toString("hex");
            // check to see if we already have it - and
            // TO DO: update it?
            this.database.query("SELECT * FROM stations WHERE device_id = ?", [deviceId]).then(dbResponse => {
                if (dbResponse.length > 0) {
                    // already have this station in db - update?
                } else {
                    this.addStation(deviceId, address, result);
                }
            });
        });
    }

    addStation(deviceId, address, response) {
        let deviceStatus = response.status;
        let modules = response.modules;
        let station = {
            deviceId: deviceId,
            name: deviceStatus.identity.device,
            url: address,
            status: "Ready to deploy",
            modules: "",
            battery_level: deviceStatus.power.battery.percentage,
            available_memory: 100 - deviceStatus.memory.dataMemoryConsumption.toFixed(2)
        };
        this.insertStation(station).then(id => {
            modules.map(m => {
                m.stationId = id;
                this.insertModule(m).then(mid => {
                    m.sensors.map(s => {
                        s.moduleId = mid;
                        this.insertSensor(s);
                    });
                });
            });
        });
    }

    generateReading(name) {
        let reading = 0;
        switch (name) {
            case "pH Sensor":
                reading = Math.random() * Math.floor(14);
                break;
            case "DO Sensor":
                reading = Math.random() * Math.floor(15);
                break;
            case "Conductivity Sensor":
            case "Conductivity":
                reading = Math.random() * Math.floor(20000);
                break;
            case "Temperature Sensor":
            case "Temperature":
                reading = Math.random() * Math.floor(200);
                break;
            case "Wind Sensor":
                reading = Math.random() * Math.floor(200);
                break;
            case "Rain Sensor":
                reading = Math.random() * Math.floor(10);
                break;
            case "Depth":
                reading = Math.random() * Math.floor(2000);
                break;
            default:
                reading = Math.random() * Math.floor(10);
        }
        return reading.toFixed(2);
    }

    insertSensor(sensor) {
        sensor.current_reading = this.generateReading(sensor.name);
        return this.database.execute(
            "INSERT INTO sensors (module_id, name, unit, frequency, current_reading) VALUES (?, ?, ?, ?, ?)",
            [sensor.moduleId, sensor.name, sensor.unitOfMeasure, sensor.frequency, sensor.current_reading]
        );
    }

    insertModule(module) {
        module.interval = Math.round(Math.random() * maxInterval + minInterval);
        return this.database.execute(
            "INSERT INTO modules (module_id, device_id, name, interval, station_id) VALUES (?, ?, ?, ?, ?)",
            [module.moduleId, module.deviceId, module.name, module.interval, module.stationId]
        );
    }

    insertStation(station) {
        let newStation = new Station(station);
        return this.database.execute(
            "INSERT INTO stations (device_id, name, url, status, battery_level, connected, available_memory, interval) \
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                newStation.deviceId,
                newStation.name,
                newStation.url,
                newStation.status,
                newStation.battery_level,
                newStation.connected,
                newStation.available_memory,
                newStation.interval
            ]
        );
    }
}

class Station {
    constructor(_station) {
        // created_at, and updated_at will be generated
        this.deviceId = _station.deviceId;
        this.name = _station.name
            ? _station.name
            : "FieldKit Station " + Math.floor(Math.random() * Math.floor(9000));
        this.url = _station.url ? _station.url : "no_url";
        this.status = _station.status;
        this.battery_level = _station.battery_level
            ? _station.battery_level
            : Math.floor(Math.random() * Math.floor(100));
        this.connected = "true";
        this.available_memory = _station.available_memory
            ? _station.available_memory
            : Math.floor(Math.random() * Math.floor(100));
        this.modules = _station.modules; // comma-delimited list of module ids
        this.interval = Math.round(Math.random() * maxInterval + minInterval);
    }
}
