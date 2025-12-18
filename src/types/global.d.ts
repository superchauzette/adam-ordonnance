import type { PreloadApi, SettingsAPI } from "../main/preload";

declare global {
  interface Window {
    api: PreloadApi & {
      selectFile: () => Promise<string | null>;
      listOutputFolders: () => Promise<{
        success: boolean;
        folders: string[];
        error?: string;
      }>;
      getSecretaryEmailMapping: () => Promise<{
        success: boolean;
        mapping: Record<string, string>;
        error?: string;
      }>;
      listOutputFiles: (folderName: string) => Promise<{
        success: boolean;
        files: string[];
        error?: string;
      }>;
    };
    settingsAPI: SettingsAPI;
  }
}

export {};
