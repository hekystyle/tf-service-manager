import { defineStore } from "pinia";

interface SettingState {
  gitCheckoutType: string;
  selectedServices: string[];
  ideCommand: string;
  leftDrawerDefaultOpen: boolean;
  showMonitorCharts: boolean;
}

export const useSettingsStore = defineStore("tf-sm-settings", {
  persist: true,
  state: () =>
    ({
      gitCheckoutType: "ssh",
      selectedServices: [],
      ideCommand: "code",
      leftDrawerDefaultOpen: true,
      showMonitorCharts: true,
    }) as SettingState,

  getters: {},
  actions: {},
});
