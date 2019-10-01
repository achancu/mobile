import _ from 'lodash';
import axios from "axios";
import protobuf from "protobufjs";
import deepmerge from 'deepmerge';
import { promiseAfter } from '../utilities';
import Config from '../config';

const appRoot = protobuf.Root.fromJSON(require("fk-app-protocol"));
const HttpQuery = appRoot.lookupType("fk_app.HttpQuery");
const HttpReply = appRoot.lookupType("fk_app.HttpReply");
const QueryType = appRoot.lookup("fk_app.QueryType");
const ReplyType = appRoot.lookup("fk_app.ReplyType");

const log = Config.logger("QueryStation");

const MandatoryStatus = {
    status: {
        identity: {
        },
        power: {
            battery: {
                percentage: 0.0
            }
        },
        memory: {
            dataMemoryConsumption: 0
        },
        recording: {
            enabled: false,
        }
    },
};

export default class QueryStation {
    getStatus(address) {
        const message = HttpQuery.create({
            type: QueryType.values.QUERY_STATUS
        });

        return this.stationQuery(address, message).then(reply => {
            return this._fixupStatus(reply);
        });
    }

    takeReadings(address) {
        const message = HttpQuery.create({
            type: QueryType.values.QUERY_TAKE_READINGS
        });

        return this.stationQuery(address, message).then(reply => {
            return this._fixupStatus(reply);
        });
    }

    startDataRecording(address) {
        const message = HttpQuery.create({
            type: QueryType.values.QUERY_RECORDING_CONTROL,
            recording: { modifying: true, enabled: true }
        });

        return this.stationQuery(address, message).then(reply => {
            return this._fixupStatus(reply);
        });
    }

    stopDataRecording(address) {
        const message = HttpQuery.create({
            type: QueryType.values.QUERY_RECORDING_CONTROL,
            recording: { modifying: true, enabled: false }
        });

        return this.stationQuery(address, message).then(reply => {
            return this._fixupStatus(reply);
        });
    }

    sendNetworkSettings(address, networks) {
        const message = HttpQuery.create({
            type: QueryType.values.QUERY_CONFIGURE,
            networkSettings: { networks: networks }
        });

        return this.stationQuery(address, message).then(reply => {
            return this._fixupStatus(reply);
        });
    }

    sendLoraSettings(address, lora) {
        const message = HttpQuery.create({
            type: QueryType.values.QUERY_CONFIGURE,
            loraSettings: { appEui: lora.appEui, appKey: lora.appKey }
        });
        return this.stationQuery(address, message).then(reply => {
            return this._fixupStatus(reply);
        });
    }

    configureName(address, name) {
        const message = HttpQuery.create({
            type: QueryType.values.QUERY_CONFIGURE,
            identity: { name: name }
        });

        return this.stationQuery(address, message).then(reply => {
            return this._fixupStatus(reply);
        });
    }

    /**
     * Perform a single station query, setting all the critical defaults for the
     * HTTP request and handling any necessary translations/conversations for
     * request/response bodies.
     */
    stationQuery(url, message) {
        if (!Config.developer.stationFilter(url)) {
            return Promise.reject("ignored");
        }
        const binaryQuery = HttpQuery.encodeDelimited(message).finish();
        const requestBody = new Buffer.from(binaryQuery).toString("hex");
        log("querying", url, message, requestBody);
        return axios({
            method: "POST",
            url: url,
            headers: {
                /* When we get rid of this hex encoding nonsense we'll fix this, too */
                // 'Content-Type': 'application/octet-stream',
                "Content-Type": "text/plain"
            },
            data: requestBody
        }).then(
            response => {
                if (response.data.length == 0) {
                    log("query success", "<empty>");
                    return {};
                }
                const binaryReply = Buffer.from(response.data, "hex");
                const decoded = HttpReply.decodeDelimited(binaryReply);
                return this._handlePotentialBusyReply(decoded, url, message).then(finalReply => {
                    log("query success", finalReply);
                    return finalReply;
                });
            },
            err => {
                log("query error", err);
                // NOET This should be a Promise.reject'ion.
                return { errors: [ err ] };
            }
        );
    }

    _fixupStatus(reply) {
        if (reply.errors) {
            return reply;
        }
        // NOTE deepmerge ruins deviceId.
        if (reply.status && reply.status.identity) {
            reply.status.identity.deviceId = new Buffer.from(reply.status.identity.deviceId).toString("hex");
        }
        if (reply.streams && reply.streams.length > 0) {
            reply.streams.forEach(s => {
                s.block = s.block ? s.block : 0;
                s.size = s.size ? s.size : 0;
            });
        }

        return deepmerge.all([MandatoryStatus, reply]);
    }

    _handlePotentialBusyReply(reply, url, message) {
        if (reply.type != ReplyType.values.REPLY_BUSY) {
            return Promise.resolve(reply);
        }
        const delays = _.sumBy(reply.errors, 'delay');
        if (delays == 0) {
            return Promise.reject(new Error('busy'));
        }
        return this._retryAfter(delays, url, message);
    }

    _retryAfter(delays, url, message) {
        log("retrying after", delays);
        return promiseAfter(delays).then(() => {
            return this.stationQuery(url, message);
        });
    }
}
