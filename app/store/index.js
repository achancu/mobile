import _ from "lodash";
import Vuex from "vuex";
import { nearby } from "./modules/nearby";
import { stations } from "./modules/stations";
import { phone } from "./modules/phone";
import { nav } from "./modules/nav";
import { network } from "./modules/network";
import { map } from "./modules/map";
import { clock } from "./modules/clock";
import createLogger from "./logger";
import * as MutationTypes from "./mutations";
import * as ActionTypes from "./actions";
import Config from "../config";

function customizeLogger() {
    return createLogger({
        filter(mutation, stateBefore, stateAfter) {
            if (mutation.type == MutationTypes.TICK) {
                return false;
            }
            if (mutation.type == MutationTypes.NAVIGATION) {
                console.log("mutation: navigation", mutation.payload);
                return false;
            }
            if (mutation.type == MutationTypes.PHONE_LOCATION) {
                return false;
            }
            if (mutation.type == MutationTypes.PHONE_NETWORK) {
                return false;
            }
            return true;
        },
        actionFilter(action, state) {
            if (action.type == ActionTypes.REFRESH) {
                return false;
            }
            if (action.type == ActionTypes.QUERY_NECESSARY) {
                return false;
            }
            return true;
        },
        transformer(state) {
            const { clock, nearby, stations, phone, map, network, nav } = state;
            return {
                clock,
                nav,
                phone,
                nearby,
                map,
                network,
                stations: {
                    deviceIds: _(stations.all)
                        .keyBy(s => s.deviceId)
                        .mapValues(s => {
                            return {
                                name: s.name,
                            };
                        })
                        .value(),
                },
            };
        },
        mutationTransformer(mutation) {
            return mutation;
        },
        actionTransformer(action) {
            return action;
        },
        logActions: true,
        logMutations: true,
    });
}

export default function () {
    return new Vuex.Store({
        plugins: Config.env.dev ? [customizeLogger()] : [],
        modules: {
            clock,
            nearby,
            stations,
            phone,
            nav,
            network,
            map,
        },
        // This was causing a call stack error (_traverse)
        strict: false, // process.env.NODE_ENV !== "production",
    });
}