import Vue from "../../wrappers/vue";
import * as ActionTypes from "../actions";
import * as MutationTypes from "../mutations";

export class PortalState {
    authenticated: boolean = false;
}

type ActionParameters = { commit: any };

const getters = {};

const actions = {
    [ActionTypes.INITIALIZE]: ({ commit }: ActionParameters) => {
        //
    },
    [ActionTypes.UPDATE_PORTAL]: ({ commit }: ActionParameters) => {
        //
    },
};

const mutations = {
    [MutationTypes.RESET]: (state: PortalState, error: string) => {
        Object.assign(state, new PortalState());
    },
    [MutationTypes.LOGIN]: (state: PortalState, token: string) => {
        Vue.set(state, "authenticated", true);
    },
    [MutationTypes.LOGOUT]: (state: PortalState) => {
        Vue.set(state, "authenticated", false);
    },
};

const state = () => new PortalState();

export const portal = {
    namespaced: false,
    state,
    getters,
    actions,
    mutations,
};
