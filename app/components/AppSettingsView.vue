<template>
    <Page class="page" actionBarHidden="true" @loaded="onPageLoaded">
        <GridLayout rows="75,*,55">
            <ScreenHeader row="0" :title="_L('fieldkitSettings')" :canNavigateBack="false" :canNavigateSettings="false" class="m-t-10" />
            <ScrollView row="1">
                <FlexboxLayout flexDirection="column" class="p-t-10">
                    <StackLayout class="m-x-10 m-y-20" orientation="vertical">
                        <StackLayout>
                            <Label :text="_L('accounts')" class="size-16 m-b-10" textWrap="true" />
                        </StackLayout>
                        <StackLayout v-for="account in accounts" orientation="horizontal" class="v-middle">
                            <Label :text="account.email" class="size-14 m-10 v-middle"/>
                            <Image v-if="account.email == currentUser.email" width="10" class="v-middle" src="~/images/Icon_Save.png"></Image>
                        </StackLayout>
                    </StackLayout>
                    <StackLayout class="m-x-20 m-y-20 v-middle" @tap="addAccount" orientation="horizontal">
                        <Image width="16" class="m-r-10" src="~/images/Icon_Add_Button.png"></Image>
                        <Label :text="_L('addAccount')" class="v-middle"></Label>
                    </StackLayout>
                    <StackLayout>
                        <Button v-if="loggedIn && accounts.length > 1" class="btn btn-secondary" :text="_L('logOutAll')" @tap="logout"></Button>
                        <Button v-if="loggedIn && accounts.length === 1" class="btn btn-secondary" :text="_L('logOut')" @tap="logout"></Button>
                        <Button v-if="!loggedIn" class="btn btn-primary" :text="_L('logIn')" @tap="goToLogin"></Button>
                    </StackLayout>
                    <StackLayout class="m-x-10 m-y-20">
                        <Label :text="'Build: ' + versions.buildNumber" class="size-16 m-b-10" textWrap="true" />
                        <Label :text="'Time: ' + versions.buildTime" class="size-16 m-b-10" textWrap="true" />
                        <Label :text="'Tag: ' + versions.buildTag" class="size-16 m-b-10" textWrap="true" />
                        <Label :text="'Hash: ' + versions.gitHash" class="size-16 m-b-10" textWrap="true" />
                    </StackLayout>
                </FlexboxLayout>
            </ScrollView>
            <!-- footer -->
            <ScreenFooter row="2" active="settings" />
        </GridLayout>
    </Page>
</template>

<script>
import routes from "../routes";
import ScreenHeader from "./ScreenHeader";
import ScreenFooter from "./ScreenFooter";
import { Build } from "../config";

export default {
    data() {
        return {
            loggedIn: this.$portalInterface.isLoggedIn(),
            versions: Build,
            currentUser: this.$portalInterface._currentUser
        };
    },
    computed: {
        accounts() {
            return this.$store.state.portal.accounts;
        },
    },
    components: {
        ScreenHeader,
        ScreenFooter,
    },
    methods: {
        onPageLoaded() {},

        logout() {
            this.$portalInterface.logout();
            this.$navigateTo(routes.login, {
                clearHistory: true,
                props: {
                    resetUser: true,
                },
            });
        },

        goToLogin() {
            this.$navigateTo(routes.login);
        },

        addAccount() {
            this.$navigateTo(routes.addAccount);
        }
    },
};
</script>

<style scoped lang="scss">
// Start custom common variables
@import "../app-variables";
// End custom common variables
.v-middle {
    vertical-align: middle;
}
// Custom styles
</style>
