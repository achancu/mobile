<template>
    <Page class="page plain" actionBarHidden="true" @loaded="onPageLoaded">
        <ScrollView>
            <FlexboxLayout flexDirection="column" justifyContent="space-between" class="p-t-10">
                <ScreenHeader :title="module.name" :onBack="goBack" :canNavigateSettings="false" />

                <GridLayout rows="auto" columns="40*,60*" class="location-container m-x-10">
                    <StackLayout row="0" col="0" class="m-y-8 m-x-5">
                        <Image width="100" src="~/images/placeholder_module_location.png"></Image>
                    </StackLayout>
                    <StackLayout row="0" col="1" class="m-y-8">
                        <Label class="size-14" :text="_L('locateYourModule', module.name)" textWrap="true"></Label>
                    </StackLayout>
                </GridLayout>

                <template v-if="sensors.length > 1">
                    <GridLayout rows="*" columns="*" class="m-10">
                        <DropDown
                            row="0"
                            col="0"
                            class="p-5 size-18 drop-down"
                            id="sensors-drop-down"
                            :items="sensorNames"
                            @opened="onOpened"
                            @closed="onClosed"
                            selectedIndex="0"
                            @selectedIndexChanged="onSelectedIndexChanged"
                        ></DropDown>
                        <Image
                            row="0"
                            col="0"
                            width="15"
                            class="m-r-5"
                            horizontalAlignment="right"
                            verticalAlignment="middle"
                            src="~/images/Icon_Cheveron_Down.png"
                            @tap="openDropDown"
                        />
                    </GridLayout>
                </template>

                <StackLayout v-for="(g, graphIndex) in graphedSensors" :key="g.id" class="m-b-15">
                    <GridLayout
                        rows="auto,auto,auto,auto"
                        columns="10*,80*,10*"
                        :automationText="'graphedSensorChart' + graphIndex"
                        class="chart-section-container m-x-10"
                    >
                        <Label row="0" colSpan="2" class="text-center center-title" :text="g.name"></Label>
                        <StackLayout
                            v-if="sensors.length > 1"
                            row="0"
                            col="2"
                            class="round small-round"
                            :id="'chart-' + g.id"
                            @tap="removeChart"
                            verticalAlignment="top"
                        >
                            <Image width="17" src="~/images/Icon_Close.png"></Image>
                        </StackLayout>
                        <Label row="1" col="0" class="size-10 m-l-2" :text="g.unit"></Label>
                        <RadCartesianChart row="2" colSpan="3" class="chart-container">
                            <LinearAxis v-tkCartesianHorizontalAxis labelFormat="%.1f" :majorStep="timeStep" />
                            <LinearAxis v-tkCartesianVerticalAxis labelLayoutMode="Outer" lineHidden="false" labelMargin="5" />
                            <ScatterSeries
                                v-tkCartesianSeries
                                :items="g.readings"
                                seriesName="scatterplot"
                                xProperty="time"
                                yProperty="reading"
                            />
                            <Palette v-tkCartesianPalette seriesName="scatterplot">
                                <PaletteEntry v-tkCartesianPaletteEntry fillColor="#0A67AA" strokeColor="#FFFFFF" strokeWidth="2" />
                            </Palette>
                        </RadCartesianChart>
                        <Label row="3" colSpan="3" class="text-center size-10 m-b-5 capitalize" :text="g.intervalUnit"></Label>
                    </GridLayout>
                </StackLayout>

                <!-- footer -->
                <ScreenFooter :station="station" active="stations" />
            </FlexboxLayout>
        </ScrollView>
    </Page>
</template>

<script>
import routes from "../routes";
import Services from "../services/services";
import ScreenHeader from "./ScreenHeader";
import ScreenFooter from "./ScreenFooter";

const dbInterface = Services.Database();

export default {
    data() {
        return {
            timeStep: 5,
            module: {
                name: "",
            },
            sensors: [
                {
                    name: "",
                    readings: [],
                    intervalUnit: "",
                },
            ],
            sensorNames: [_L("select")],
            graphedSensors: [],
        };
    },
    props: ["moduleId", "station"],
    components: {
        ScreenHeader,
        ScreenFooter,
    },
    methods: {
        onPageLoaded(args) {
            this.page = args.object;

            let user = this.$portalInterface.getCurrentUser();
            this.userName = user.name;

            this.getModule().then(this.getSensors);
        },

        goBack(event) {
            let cn = event.object.className;
            event.object.className = cn + " pressed";
            setTimeout(() => {
                event.object.className = cn;
            }, 500);

            this.$navigateTo(routes.stationDetail, {
                props: {
                    stationId: this.stationId,
                },
            });
        },

        goToConfigure(event) {
            let cn = event.object.className;
            event.object.className = cn + " pressed";
            setTimeout(() => {
                event.object.className = cn;
            }, 500);

            this.$navigateTo(routes.configureModule, {
                props: {
                    moduleId: this.moduleId,
                    station: this.station,
                    origin: "detail",
                },
            });
        },

        getModule() {
            return dbInterface.getModule(this.moduleId);
        },

        getSensors(module) {
            this.module = module[0];
            this.module.origGraphs = this.module.graphs;
            dbInterface.getSensors(this.module.deviceId).then(this.completeSetup);
        },

        completeSetup(sensors) {
            let graphs = this.module.graphs ? this.module.graphs.split(",") : [];
            // number of faux readings
            let numReadings = Math.round(Math.random() * 20 + 10);
            let names = [_L("select")];
            sensors.forEach((s, i) => {
                names.push(s.name);
                s.unit = s.unit != "" ? "(" + s.unit + ")" : s.unit;
                s.intervalUnit = this.calculateTimeUnit();
                s.readings = [];
                // generate faux readings, if not a real device
                if (this.station.url == "no_url") {
                    let low = s.currentReading / 2;
                    for (var i = 0; i < numReadings; i++) {
                        let reading = Math.random() * low + low;
                        s.readings.push({ time: i, reading: reading });
                    }
                }
            });
            // separate iteration to preserve order - worth it?
            let toDisplay = [];
            graphs.forEach(g => {
                let sensor = sensors.find(s => {
                    return s.id == g;
                });
                if (sensor) {
                    toDisplay.push(sensor);
                }
            });
            this.sensors = sensors;
            this.sensorNames = names;
            this.graphedSensors = toDisplay.length == 0 ? [this.sensors[0]] : toDisplay;
        },

        calculateTimeUnit() {
            let unit = "";
            if (this.module.interval < 60) {
                unit = "seconds";
            } else if (this.module.interval < 3600) {
                unit = "minutes";
            } else if (this.module.interval < 86400) {
                unit = "hours";
            } else if (this.module.interval < 604800) {
                unit = "days";
            } else {
                unit = "weeks";
            }
            return unit;
        },

        openDropDown(event) {
            const dropDown = this.page.getViewById("sensors-drop-down");
            dropDown.open();
        },

        onOpened(event) {
            this.changeEvents = 0;
            // provide feedback by temporarily changing background color
            event.object.backgroundColor = "#CCCDCF";
            setTimeout(() => {
                event.object.backgroundColor = "#F4F5F7";
            }, 500);
        },

        onClosed(event) {
            this.changeEvents += 1;
            this.finalizeChange();
        },

        onSelectedIndexChanged(event) {
            // console.log(event.oldIndex, event.newIndex)
            this.selectedSensor = this.sensorNames[event.newIndex];
            this.changeEvents += 1;
            this.finalizeChange();
        },

        // iOS gets change first, and android gets close first
        // so wait for both before adding new selection
        finalizeChange() {
            if (!this.selectedSensor || this.selectedSensor == _L("select")) {
                return;
            }
            if (this.changeEvents > 1) {
                this.changeEvents = 0;

                let sensor = this.sensors.find(s => {
                    return s.name == this.selectedSensor;
                });
                // add to graphedSensors, if not already present
                let index = this.graphedSensors.findIndex(s => {
                    return s.id == sensor.id;
                });
                if (index == -1) {
                    this.graphedSensors.push(sensor);
                    this.saveGraphs();
                }
            }
        },

        removeChart(event) {
            let cn = event.object.className;
            event.object.className = cn + " pressed";

            let id = event.object.id.split("chart-")[1];
            let index = this.graphedSensors.findIndex(s => {
                return s.id == id;
            });
            // remove from graphedSensors
            if (index > -1) {
                this.graphedSensors.splice(index, 1);
                this.saveGraphs();
            }
        },

        saveGraphs() {
            let graphs = "";
            this.graphedSensors.forEach(g => {
                graphs += graphs == "" ? g.id : "," + g.id;
            });
            if (this.module.origGraphs != graphs) {
                this.module.graphs = graphs;
                dbInterface.setModuleGraphs(this.module);
                let configChange = {
                    moduleId: this.module.id,
                    before: this.module.origGraphs,
                    after: this.module.graphs,
                    affectedField: "graphs",
                    author: this.userName,
                };
                dbInterface.recordModuleConfigChange(configChange);
                this.module.origGraphs = this.module.graphs;
            }
        },
    },
};
</script>

<style scoped lang="scss">
// Start custom common variables
@import "../app-variables";
// End custom common variables

// Custom styles
.module-name {
    width: 195;
}

.small-round {
    width: 40;
    border-radius: 20;
    padding-top: 7;
    padding-bottom: 7;
}

.location-container {
    border-radius: 4;
    border-color: $fk-gray-lighter;
    border-width: 1;
}

.chart-section-container {
    border-radius: 4;
    border-color: $fk-gray-lighter;
    border-width: 1;
}

.center-title {
    margin-left: 40;
}

.chart-container {
    height: 200;
}

.capitalize {
    text-transform: capitalize;
}

.drop-down {
    background-color: white;
    border-width: 0;
    border-bottom-width: 1;
    border-bottom-color: $fk-primary-black;
}
</style>
