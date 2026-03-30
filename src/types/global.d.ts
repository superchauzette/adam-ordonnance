import type { PreloadApi, SettingsAPI } from "../main/preload";

declare global {
  type SupabasePatientReferenceRow = {
    id: string;
    nom: string;
    prenom: string;
    date_naissance: string;
    type_pompe: string;
    type_capteur: string;
    dlp_pompe: string;
    prescripteur: string;
    centre_initiateur: string;
  };

  interface Window {
    api: PreloadApi;
    settingsAPI: SettingsAPI;
  }
}

export {};
