import { contextBridge, ipcRenderer } from "electron";

const api = {
  ping: () => ipcRenderer.invoke("ping"),
  selectFile: () => ipcRenderer.invoke("select-file"),
  selectOutputFolder: () => ipcRenderer.invoke("select-output-folder"),
  listOutputFolders: () => ipcRenderer.invoke("output:list-folders"),
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
  listOutputFiles: (folderName: string) =>
    ipcRenderer.invoke("output:list-files", folderName),
  getSecretaryEmailMapping: () =>
    ipcRenderer.invoke("email:get-secretary-mapping"),
  sendEmail: (
    to: string,
    subject: string,
    body: string,
    folderName: string,
    files: string[],
    mode: "draft" | "send"
  ) =>
    ipcRenderer.invoke(
      "email:send",
      to,
      subject,
      body,
      folderName,
      files,
      mode
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
