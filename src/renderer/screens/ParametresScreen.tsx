import { useEffect, useState, type ChangeEvent } from "react";
import { FolderPicker } from "../components/FolderPicker";
import { FilePicker } from "../components/FilePicker";

type ParametresScreenProps = {};

export function ParametresScreen({}: ParametresScreenProps) {
  const [templateDir, setTemplateDir] = useState("");
  const [body, setBody] = useState("");
  const [sendMailsScriptPath, setSendMailsScriptPath] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const [
        savedTemplateDir,
        savedBody,
        savedScriptPath,
        savedSupabaseUrl,
        savedSupabaseServiceRoleKey,
      ] = await Promise.all([
        window.settingsAPI.get("templateDir"),
        window.settingsAPI.get("body"),
        window.settingsAPI.get("sendMailsScriptPath"),
        window.settingsAPI.get("supabaseUrl"),
        window.settingsAPI.get("supabaseServiceRoleKey"),
      ]);

      if (savedTemplateDir && typeof savedTemplateDir === "string") {
        setTemplateDir(savedTemplateDir);
      }

      if (savedBody && typeof savedBody === "string") {
        setBody(savedBody);
      }

      if (savedScriptPath && typeof savedScriptPath === "string") {
        setSendMailsScriptPath(savedScriptPath);
      }

      if (savedSupabaseUrl && typeof savedSupabaseUrl === "string") {
        setSupabaseUrl(savedSupabaseUrl);
      }

      if (
        savedSupabaseServiceRoleKey &&
        typeof savedSupabaseServiceRoleKey === "string"
      ) {
        setSupabaseServiceRoleKey(savedSupabaseServiceRoleKey);
      }
    };
    loadSettings();
  }, []);

  const handleTemplateDirChange = async (path: string) => {
    setTemplateDir(path);
    await window.settingsAPI.set("templateDir", path);
  };

  const handleBodyChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBody(value);
    await window.settingsAPI.set("body", value);
  };

  const handleScriptPathChange = async (path: string) => {
    setSendMailsScriptPath(path);
    await window.settingsAPI.set("sendMailsScriptPath", path);
  };

  const handleSupabaseUrlChange = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setSupabaseUrl(value);
    await window.settingsAPI.set("supabaseUrl", value);
  };

  const handleSupabaseServiceRoleKeyChange = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setSupabaseServiceRoleKey(value);
    await window.settingsAPI.set("supabaseServiceRoleKey", value);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">
          Configurez les chemins utilisés par l'application
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          <FolderPicker
            label="Dossier des templates"
            value={templateDir}
            onChange={handleTemplateDirChange}
            placeholder="Sélectionnez le dossier contenant les templates .docx"
          />

          <div className="border-t pt-4 mt-6">
            <p className="text-sm text-gray-500">
              Le dossier des templates doit contenir :
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
              <li>
                Un dossier <code className="bg-gray-100 px-1 rounded">type-ordonance/</code> avec les modèles .docx
              </li>
              <li>
                Un fichier <code className="bg-gray-100 px-1 rounded">correspondance-type-ordo.xlsx</code>
              </li>
            </ul>
          </div>

          <div className="border-t pt-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">
                Message par défaut
              </span>
              <p className="text-xs text-gray-500 mb-2">
                Texte utilisé par défaut dans les emails envoyés aux secrétaires
              </p>
              <textarea
                value={body}
                onChange={handleBodyChange}
                rows={8}
                placeholder="Bonjour,&#10;&#10;Veuillez trouver ci-joint les ordonnances demandées.&#10;&#10;Cordialement,"
                className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                transition-all"
              />
            </label>
          </div>

          <div className="border-t pt-6">
            <FilePicker
              label="Script PowerShell d'envoi d'emails"
              value={sendMailsScriptPath}
              onChange={handleScriptPathChange}
              placeholder="src/scripts/send-mails.ps1"
              buttonLabel="Sélectionner le script"
              filters={[{ name: "PowerShell", extensions: ["ps1"] }]}
            />
            <p className="text-xs text-gray-500 mt-2">
              Chemin du script PowerShell utilisé pour envoyer les emails via Outlook
            </p>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Connexion Supabase
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Utilisée par la génération des ordonnances pour lire le référentiel
                patients de <code className="bg-gray-100 px-1 rounded">espace-sante</code>.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">
                URL Supabase
              </span>
              <input
                type="text"
                value={supabaseUrl}
                onChange={handleSupabaseUrlChange}
                placeholder="https://xxxxx.supabase.co"
                className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                transition-all"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">
                Clé service role Supabase
              </span>
              <input
                type="password"
                value={supabaseServiceRoleKey}
                onChange={handleSupabaseServiceRoleKeyChange}
                placeholder="service role key"
                className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                transition-all"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
