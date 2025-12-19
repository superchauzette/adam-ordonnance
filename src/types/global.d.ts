import type { PreloadApi, SettingsAPI } from "../main/preload";

declare global {
  interface Window {
    api: PreloadApi;
    settingsAPI: SettingsAPI;
  }
}

export {};
