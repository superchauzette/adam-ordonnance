import { useEffect, useState } from "react";
import { FolderPicker } from "../components/FolderPicker";

type ParametresScreenProps = {};

export function ParametresScreen({}: ParametresScreenProps) {
  const [templateDir, setTemplateDir] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const savedTemplateDir = await window.settingsAPI.get("templateDir");
      if (savedTemplateDir && typeof savedTemplateDir === "string") {
        setTemplateDir(savedTemplateDir);
      }
      
      const savedBody = await window.settingsAPI.get("body");
      if (savedBody && typeof savedBody === "string") {
        setBody(savedBody);
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
        </div>
      </div>
    </div>
  );
}
