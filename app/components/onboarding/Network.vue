<template>
    <Page class="page" actionBarHidden="true" @loaded="onPageLoaded">
        <GridLayout rows="*,140">
            <ScrollView row="0">
                <GridLayout rows="*" columns="*">
                    <StackLayout row="0" verticalAlignment="middle">
                        <Label class="title m-t-20 m-b-10 text-center" :text="_L('chooseWifiSettings')" textWrap="true"></Label>

                        <Label class="instruction" :text="_L('chooseWifiInstruction')" lineHeight="4" textWrap="true"></Label>

                        <GridLayout rows="auto,auto" columns="30,*" class="option-container">
                            <CheckBox
                                row="0"
                                col="0"
                                :checked="form.options[0].selected"
                                :isEnabled="!form.options[0].selected"
                                fillColor="#2C3E50"
                                onCheckColor="#2C3E50"
                                onTintColor="#2C3E50"
                                fontSize="18"
                                boxType="circle"
                                class="checkbox"
                                @checkedChange="$event.value !== form.options[0].selected && toggleChoice(0)"
                            />
                            <Label row="0" col="1" class="m-t-5 m-l-5" :text="_L('stationWifi')"></Label>
                            <Label row="1" colSpan="2" class="radio-info size-15" lineHeight="4" :text="_L('stationWifiInfo')" textWrap="true"></Label>
                        </GridLayout>

                        <GridLayout rows="auto,auto" columns="30,*" class="option-container">
                            <CheckBox
                                row="0"
                                col="0"
                                :checked="form.options[1].selected"
                                :isEnabled="!form.options[1].selected"
                                fillColor="#2C3E50"
                                onCheckColor="#2C3E50"
                                onTintColor="#2C3E50"
                                fontSize="18"
                                boxType="circle"
                                class="checkbox"
                                @checkedChange="$event.value !== form.options[1].selected && toggleChoice(1)"
                            />
                            <Label row="0" col="1" class="m-t-5 m-l-5" :text="_L('yourWifi')"></Label>
                            <Label row="1" colSpan="2" class="radio-info size-15" lineHeight="4" :text="_L('yourWifiInfo')" textWrap="true"></Label>
                        </GridLayout>
                    </StackLayout>
                </GridLayout>
            </ScrollView>

            <StackLayout :row="1" verticalAlignment="bottom" class="m-x-10">
                <Button class="btn btn-primary btn-padded m-y-10" :text="_L('next')" @tap="forward"></Button>
            </StackLayout>
        </GridLayout>
    </Page>
</template>

<script>
import routes from "../../routes";
import { _T } from "../../utilities";
import * as i18n from "tns-i18n";
i18n("en");

export default {
    props: {
        stationId: {
            type: Number,
            required: true,
        },
    },
    data() {
        return {
            form: {
                options: [{ selected: true }, { selected: false }],
            },
        };
    },
    methods: {
        onPageLoaded(args) {},
        forward() {
            if (this.form.network == 1) {
                return this.$navigateTo(routes.onboarding.rename, {
                    props: {
                        stationId: this.stationId,
                    },
                });
            }
            if (this.form.network == 2) {
            }
        },
        toggleChoice(index) {
            this.form.options[0].selected = false;
            this.form.options[1].selected = false;
            this.form.options[index].selected = true;
        },
    },
};
</script>

<style scoped lang="scss">
@import "../../app-variables";

.skip {
    padding-top: 10;
    padding-bottom: 10;
    background-color: white;
    font-size: 14;
    font-weight: bold;
    text-align: center;
    margin: 10;
}
.instruction {
    color: $fk-primary-black;
    text-align: center;
    font-size: 16;
    margin-top: 5;
    margin-bottom: 10;
    margin-right: 30;
    margin-left: 30;
}
.option-container {
    margin-top: 30;
    margin-left: 30;
    margin-right: 30;
}
.radio-info {
    color: $fk-gray-hint;
    margin-top: 10;
    margin-bottom: 20;
    margin-left: 35;
}
.input {
    width: 90%;
    margin-left: 20;
    margin-right: 20;
    border-bottom-width: 1px;
    text-align: center;
}
.small {
    width: 50;
    margin: 20;
}

.bordered-container {
    border-radius: 4;
    border-color: $fk-gray-lighter;
    border-width: 1;
}
.gray-text {
    color: $fk-gray-hint;
}
.red-text {
    color: $fk-primary-red;
}
</style>
