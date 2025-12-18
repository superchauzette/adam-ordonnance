import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import { generateOrdonnances } from "./jobs/generateOrdonnace";
import { settings } from "./settings";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let mainWindow: BrowserWindow | null = null;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpcHandlers() {
  ipcMain.handle("ping", () => "pong");

  ipcMain.handle(
    "generateOrdonnances",
    async (
      _,
      inputFile: string,
      outputDir: string,
      dateFrom?: string,
      dateTo?: string
    ) => {
      try {
        const result = await generateOrdonnances(
          inputFile,
          outputDir,
          dateFrom,
          dateTo
        );
        return result;
      } catch (error) {
        console.error("Error generating ordonnances:", error);
        return { success: false, error: String(error) };
      }
    }
  );

  ipcMain.handle("select-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Excel", extensions: ["xlsx", "xls", "csv"] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("select-output-folder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Sélectionner le dossier de sortie",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("settings:get", async (_, key: string) => {
    return await settings.get(key);
  });

  ipcMain.handle("settings:set", async (_, key: string, value: any) => {
    await settings.set(key, value);
  });
}
