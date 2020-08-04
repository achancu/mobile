import Vue from "../../wrappers/vue";
import * as ActionTypes from "../actions";
import * as MutationTypes from "../mutations";
import {ServiceRef, Services} from "./utilities";
import {AccountsTableRow} from "../row-types";

export class PortalState {
    authenticated: boolean = false;
    services: ServiceRef = new ServiceRef();
    accounts: any;
}

type ActionParameters = { commit: any; dispatch: any; state: any };

const getters = {};

const actions = {
    [ActionTypes.INITIALIZE]: ({ commit }: ActionParameters) => {
        //
    },
    [ActionTypes.LOAD]: ({ commit, dispatch, state }: ActionParameters) => {
        //
        dispatch(ActionTypes.LOAD_ACCOUNTS);
    },
    [ActionTypes.UPDATE_PORTAL]: ({ commit }: ActionParameters) => {
        //
    },
    [ActionTypes.LOAD_ACCOUNTS]: ({ commit, dispatch, state }: ActionParameters) => {
        return state.services
            .db()
            .getAllAccounts()
            .then((accounts) => {
                commit(MutationTypes.LOAD_ACCOUNTS, accounts)
            })
            .catch((e) => console.log('ActionTypes.LOAD_ACCOUNTS', e))
    },
    [ActionTypes.UPDATE_ACCOUNT]: ({ commit, dispatch, state }: ActionParameters, account) => {
        return state.services
            .db()
            .addOrUpdateAccounts(account)
            .then((all) => {
                dispatch(ActionTypes.LOAD_ACCOUNTS);
            })
            .catch((e) => console.log('ActionTypes.UPDATE_ACCOUNT', e))
    },
    [ActionTypes.LOGOUT_ACCOUNTS]: ({ commit, dispatch, state }: ActionParameters) => {
        return state.services
            .db()
            .deleteAllAccounts()
            .then((all) => {
                commit(MutationTypes.LOGOUT_ACCOUNTS);
                dispatch(ActionTypes.LOAD_ACCOUNTS);
            })
            .catch((e) => console.log('ActionTypes.LOGOUT_ACCOUNTS', e))
    },
};

const mutations = {
    [MutationTypes.RESET]: (state: PortalState, error: string) => {
        Object.assign(state, new PortalState());
    },
    [MutationTypes.SERVICES]: (state: PortalState, services: () => Services) => {
        Vue.set(state, "services", new ServiceRef(services));
    },
    [MutationTypes.LOGIN]: (state: PortalState, token: string) => {
        Vue.set(state, "authenticated", true);
    },
    [MutationTypes.LOGOUT]: (state: PortalState) => {
        Vue.set(state, "authenticated", false);
    },
    [MutationTypes.LOGOUT_ACCOUNTS]: (state: PortalState) => {
        Vue.set(state, "accounts", []);
    },
    [MutationTypes.LOAD_ACCOUNTS]: (state: PortalState, accounts: AccountsTableRow) => {
        Vue.set(state, 'accounts', accounts);
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
