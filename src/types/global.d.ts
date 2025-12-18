import type { PreloadApi, SettingsAPI } from "../main/preload";

declare global {
  interface Window {
    api: PreloadApi & {
      selectFile: () => Promise<string | null>;
    };
    settingsAPI: SettingsAPI;
  }
}

export {};
