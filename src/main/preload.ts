import { contextBridge, ipcRenderer } from "electron";

const api = {
  ping: () => ipcRenderer.invoke("ping"),
  selectFile: () => ipcRenderer.invoke("select-file"),
  selectOutputFolder: () => ipcRenderer.invoke("select-output-folder"),
  generateOrdonnances: (
    inputFile: string,
    outputDir: string,
    dateFrom?: string,
    dateTo?: string
  ) =>
    ipcRenderer.invoke(
      "generateOrdonnances",
      inputFile,
      outputDir,
      dateFrom,
      dateTo
    ),
};

const settingsAPI = {
  get: (key: string) => ipcRenderer.invoke("settings:get", key),
  set: (key: string, value: any) =>
    ipcRenderer.invoke("settings:set", key, value),
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("settingsAPI", settingsAPI);

export type PreloadApi = typeof api;
export type SettingsAPI = typeof settingsAPI;
