<template>
    <Page actionBarHidden="false" @loaded="onPageLoaded">
        <ScrollView>
            <FlexboxLayout class="page login-page" justifyContent="spaceBetween">
                <Image class="logo" src="~/images/fieldkit-logo-blue.png"></Image>
                <StackLayout class="form">
                    <GridLayout rows="auto, auto, auto, auto">
                        <StackLayout row="1" class="input-field">
                            <GridLayout rows="auto" columns="*">
                                <TextField
                                    row="0"
                                    id="email-field"
                                    class="input"
                                    :hint="_L('email')"
                                    ref="email"
                                    horizontalAlignment="left"
                                    :isEnabled="!processing"
                                    keyboardType="email"
                                    autocorrect="false"
                                    autocapitalizationType="none"
                                    v-model="user.email"
                                    automationText="loginEmailInput"
                                    returnKeyType="next"
                                    @focus="showActive"
                                    @returnPress="focusPassword"
                                    @blur="checkEmail"
                                ></TextField>
                                <Image row="0" width="25" class="bottom-pad" horizontalAlignment="right" src="~/images/Icon_Email_login.png"></Image>
                            </GridLayout>
                            <StackLayout class="spacer-top" id="email-field-spacer" v-show="!noEmail && !emailNotValid"></StackLayout>
                            <Label class="validation-error" id="no-email" :text="_L('emailRequired')" textWrap="true" v-show="noEmail"></Label>
                            <Label class="validation-error" id="email-not-valid" :text="_L('emailNotValid')" textWrap="true" v-show="emailNotValid"></Label>
                        </StackLayout>

                        <StackLayout row="2" class="input-field">
                            <GridLayout rows="auto" columns="*">
                                <TextField
                                    id="password-field"
                                    class="input"
                                    :hint="_L('password')"
                                    secure="true"
                                    ref="password"
                                    horizontalAlignment="left"
                                    :isEnabled="!processing"
                                    v-model="user.password"
                                    automationText="loginPasswordInput"
                                    :returnKeyType="'done'"
                                    @focus="showActive"
                                    @blur="checkPassword"
                                ></TextField>
                                <Image row="0" width="25" class="bottom-pad" horizontalAlignment="right" src="~/images/Icon_Password_login.png"></Image>
                            </GridLayout>
                            <StackLayout class="spacer-top" id="password-field-spacer" v-show="!noPassword"></StackLayout>
                            <Label class="validation-error" id="no-password" :text="_L('passwordRequired')" textWrap="true" v-show="noPassword"></Label>
                        </StackLayout>
                        <ActivityIndicator rowSpan="4" :busy="processing"></ActivityIndicator>
                    </GridLayout>

                    <Button class="btn btn-primary btn-padded m-t-20" :text="_L('addAccount')" :isEnabled="!processing" @tap="submit"></Button>
                </StackLayout>
            </FlexboxLayout>
        </ScrollView>
    </Page>
</template>

<script>
import routes from "../routes";
import Services from "../services/services";

export default {
    data() {
        return {
            processing: false,
            noName: false,
            nameTooLong: false,
            noEmail: false,
            emailNotValid: false,
            noPassword: false,
            navigatedAway: false,
            user: {
                name: "",
                email: "",
                password: "",
            },
        };
    },
    methods: {
        onPageLoaded(args) {
            // logging out sends resetUser = true
            this.page = args.object;
        },

        showActive(event) {
            let spacer = this.page.getViewById(event.object.id + "-spacer");
            spacer.className = "spacer-top active";
        },

        checkEmail(event) {
            let spacer = this.page.getViewById("email-field-spacer");
            spacer.className = "spacer-top";
            this.noEmail = !this.user.email || this.user.email.length == 0;
            if (this.noEmail) {
                return;
            }
            let emailPattern = /^([a-zA-Z0-9_+\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
            this.emailNotValid = !emailPattern.test(this.user.email);
        },

        checkPassword(event) {
            let spacer = this.page.getViewById("password-field-spacer");
            spacer.className = "spacer-top";
            this.noPassword = !this.user.password || this.user.password.length == 0;
            if (this.noPassword) {
                return;
            }
            this.passwordTooShort = this.user.password.length < 10;
        },

        submit() {
            if (!this.user.email || !this.user.password) {
                return this.alert(_L("provideBoth"));
            }

            this.processing = true;

            return Services.PortalInterface()
                .login(this.user)
                .then(token => {
                    this.processing = false;

                    return this.$navigateTo(routes.appSettings, {});
                })
                .catch(error => {
                    this.processing = false;

                    if (!this.navigatedAway) {
                        return this.alert(_L("loginFailed"));
                    }
                });
        },

        focusEmail() {
            this.$refs.email.nativeView.focus();
        },
        focusPassword() {
            this.$refs.password.nativeView.focus();
        },

        alert(message) {
            return alert({
                title: "FieldKit",
                okButtonText: _L("ok"),
                message: message,
            });
        },
    },
};
</script>

<style scoped lang="scss">
// Start custom common variables
@import "../app-variables";
// End custom common variables

.login-page {
    font-size: 16;
    flex-direction: column;
    height: 100%;
}

.form {
    margin-left: 5;
    margin-right: 5;
    flex-grow: 2;
}

.logo {
    margin-top: 50;
    height: 47;
}

.spacer-top {
    border-top-color: $fk-gray-lighter;
    border-top-width: 2;
}

.active {
    border-top-color: $fk-secondary-blue;
}

.input-field {
    margin-bottom: 15;
}

.input {
    width: 100%;
    font-size: 16;
    color: $fk-primary-black;
    placeholder-color: $fk-gray-hint;
}

.input:disabled {
    opacity: 0.5;
}

.btn-primary {
    margin: 20 5 15 5;
}

.bottom-pad {
    margin-bottom: 8;
}

.sign-up-label {
    horizontal-align: center;
    margin-bottom: 10;
}

.validation-error {
    color: $fk-tertiary-red;
    border-top-color: $fk-tertiary-red;
    border-top-width: 2;
    padding-top: 5;
}
</style>
