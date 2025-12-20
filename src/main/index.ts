import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as fs from "node:fs";
import * as path from "path";
import xlsx from "xlsx";
import { generateOrdonnances } from "./jobs/generateOrdonnace";
import { sendEmail } from "./jobs/sendEmail";
import { wordToPdf } from "./jobs/wordToPdf";
import { settings } from "./settings";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let mainWindow: BrowserWindow | null = null;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1280,
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

  ipcMain.handle("output:list-folders", async () => {
    try {
      const outputDir = await settings.get("outputDir");
      if (!outputDir || typeof outputDir !== "string") {
        return { success: true, folders: [] as string[] };
      }

      if (!fs.existsSync(outputDir)) {
        return { success: true, folders: [] as string[] };
      }

      const entries = fs.readdirSync(outputDir, { withFileTypes: true });
      const folders = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b, "fr"));

      return { success: true, folders };
    } catch (error) {
      console.error("Error listing output folders:", error);
      return { success: false, folders: [] as string[], error: String(error) };
    }
  });

  ipcMain.handle("output:list-files", async (_, folderName: string) => {
    try {
      const outputDir = await settings.get("outputDir");
      if (!outputDir || typeof outputDir !== "string") {
        return { success: true, files: [] as string[] };
      }

      const folderPath = path.join(outputDir, folderName || "");

      if (
        !fs.existsSync(folderPath) ||
        !fs.statSync(folderPath).isDirectory()
      ) {
        return { success: true, files: [] as string[] };
      }

      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b, "fr"));

      return { success: true, files };
    } catch (error) {
      console.error("Error listing folder files:", error);
      return { success: false, files: [] as string[], error: String(error) };
    }
  });

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
    if (key === "outputDir") {
      return await settings.get("outputDir");
    }
    return undefined;
  });

  ipcMain.handle("settings:set", async (_, key: string, value: any) => {
    if (key === "outputDir") {
      await settings.set("outputDir", value);
    }
  });

  ipcMain.handle("email:get-secretary-mapping", async () => {
    try {
      const emailFile = path.resolve("src/templates/email_secretaire.xlsx");

      if (!fs.existsSync(emailFile)) {
        return {
          success: false,
          error: "Fichier email_secretaire.xlsx non trouvé",
          mapping: {},
        };
      }

      const wb = xlsx.readFile(emailFile, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json<{
        "HOPITAL": string;
        MEDECINS: string;
        "Email": string;
      }>(ws, { defval: "" });

      return { success: true, mapping: data };
    } catch (error) {
      console.error("Error reading email mapping:", error);
      return { success: false, error: String(error), mapping: {} };
    }
  });

  ipcMain.handle(
    "email:send",
    async (
      _,
      to: string,
      subject: string,
      body: string,
      folderName: string,
      files: string[],
      mode: "draft" | "send"
    ) => {
      try {
        const outputDir = await settings.get("outputDir");
        if (!outputDir || typeof outputDir !== "string") {
          return {
            success: false,
            message: "outputDir non configuré",
            error: "outputDir not set",
          };
        }

        // Build full paths for attachments
        const fullPaths = files.map((file) =>
          path.join(outputDir, folderName, file)
        );

        const result = await sendEmail({
          to,
          subject,
          body,
          files: fullPaths,
          mode,
        });

        return result;
      } catch (error) {
        console.error("Error sending email:", error);
        return {
          success: false,
          message: "Erreur lors de l'envoi",
          error: String(error),
        };
      }
    }
  );
  ipcMain.handle(
    "word-to-pdf",
    async (_, inputDocx: string, outputPdf: string) => {
      try {
        const pdfPath = await wordToPdf({ inputDocx, outputPdf });
        return { success: true, pdfPath };
      } catch (error) {
        console.error("Error converting Word to PDF:", error);
        return { success: false, error: String(error) };
      }
    }
  );
}
