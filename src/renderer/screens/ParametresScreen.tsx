import { useEffect, useState } from "react";
import { FolderPicker } from "../components/FolderPicker";

type ParametresScreenProps = {};

export function ParametresScreen({}: ParametresScreenProps) {
  const [templateDir, setTemplateDir] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const savedTemplateDir = await window.settingsAPI.get("templateDir");
      if (savedTemplateDir && typeof savedTemplateDir === "string") {
        setTemplateDir(savedTemplateDir);
      }
    };
    loadSettings();
  }, []);

  const handleTemplateDirChange = async (path: string) => {
    setTemplateDir(path);
    await window.settingsAPI.set("templateDir", path);
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
        </div>
      </div>
    </div>
  );
}
