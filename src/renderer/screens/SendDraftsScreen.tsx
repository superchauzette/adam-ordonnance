import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOutputDir } from "./useOutputDir";

type SendDraftsScreenProps = {};

const formSchema = z.object({
  to: z.string().min(1, "Destinataire requis"),
  subject: z.string().min(1, "Objet requis"),
  body: z.string().min(1, "Message requis"),
  action: z.enum(["draft", "send"]),
});

type FormValues = z.infer<typeof formSchema>;

// Custom hook: Load secretary email mapping
function useEmailMapping() {
  const [emailMapping, setEmailMapping] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const loadEmailMapping = async () => {
      try {
        const res = await window.api.getSecretaryEmailMapping();
        if (cancelled) return;
        if (res.success) {
          setEmailMapping(res.mapping);
        } else {
          console.error("Error loading email mapping:", res.error);
        }
      } catch (error) {
        console.error("Error loading email mapping:", error);
      }
    };

    loadEmailMapping();
    return () => {
      cancelled = true;
    };
  }, []);

  return emailMapping;
}

// Custom hook: Load output folders
function useOutputFolders(outputDir: string | null) {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("Sélectionnez un centre à gauche…");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await window.api.listOutputFolders();
        if (cancelled) return;
        if (res.success) {
          setFolders(res.folders);
          if (res.folders.length === 0) {
            setLog(
              outputDir
                ? "Aucun dossier trouvé dans outputDir."
                : "outputDir n'est pas configuré (voir écran Générer)."
            );
          }
        } else {
          setFolders([]);
          setLog(
            `❌ Erreur: ${res.error || "Impossible de lister les dossiers"}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [outputDir]);

  return { folders, loading, log };
}

// Custom hook: Load files for a selected folder
function useFolderFiles(selectedFolder: string | null) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!selectedFolder) {
      setFiles([]);
      return undefined;
    }

    const loadFiles = async () => {
      setLoading(true);
      try {
        const res = await window.api.listOutputFiles(selectedFolder);
        if (cancelled) return;
        if (res.success) {
          setFiles(res.files);
        } else {
          console.error("Error loading folder files:", res.error);
          setFiles([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading folder files:", error);
          setFiles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFiles();
    return () => {
      cancelled = true;
    };
  }, [selectedFolder]);

  return { files, loading };
}

export function SendDraftsScreen({}: SendDraftsScreenProps) {
  const emailMapping = useEmailMapping();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [log, setLog] = useState("");
  const [sending, setSending] = useState(false);
  const { files, loading: loadingFiles } = useFolderFiles(selectedFolder);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      to: "",
      subject: "Envoi des ordonnances",
      body: "Bonjour,\n\nCordialement,\n",
      action: "draft",
    },
  });

  // When folder is selected, try to find matching email
  useEffect(() => {
    if (selectedFolder && emailMapping) {
      const email = emailMapping.find(
        (e: any) => e.MEDECINS === selectedFolder
      )?.["Email"];

      if (email) {
        setValue("to", email, { shouldValidate: true });
      } else {
        // Clear the "to" field if no match found
        setValue("to", "", { shouldValidate: true });
      }
    }
  }, [selectedFolder, emailMapping, setValue]);

  const title = useMemo(() => {
    if (!selectedFolder) return "Envoyer un mail";
    return `Envoyer un mail — ${selectedFolder}`;
  }, [selectedFolder]);

  const submit = async (data: FormValues) => {
    if (!selectedFolder) {
      setLog("❌ Sélectionnez un centre avant d'envoyer.");
      return;
    }

    setSending(true);
    setLog(
      `⏳ ${data.action === "send" ? "Envoi" : "Mise en brouillon"} en cours...`
    );

    try {
      const result = await window.api.sendEmail(
        data.to,
        data.subject,
        data.body,
        selectedFolder,
        files,
        data.action
      );

      if (result.success) {
        setLog(`✅ ${result.message}`);
      } else {
        setLog(
          `❌ ${result.message}${result.error ? `\n${result.error}` : ""}`
        );
      }
    } catch (error) {
      setLog(`❌ Erreur: ${error}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[95vh] flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="h-full grid grid-cols-1 md:grid-cols-12">
          {/* Left: folders */}
          <NavFolders
            selectedFolder={selectedFolder}
            onSelectFolder={(folder) => setSelectedFolder(folder)}
          />

          {/* Center: form */}
          <section className="md:col-span-8 p-6 space-y-6 overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500">
                {selectedFolder
                  ? "Renseignez le destinataire, l'objet et le message."
                  : "Sélectionnez un centre dans la liste."}
              </p>
            </div>

            {Boolean(selectedFolder) && (
              <PieceJointeList
                selectedFolder={selectedFolder}
                files={files}
                loadingFiles={loadingFiles}
              />
            )}

            {Boolean(selectedFolder) && (
              <form className="space-y-5" onSubmit={handleSubmit(submit)}>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    À
                  </span>
                  <input
                    type="email"
                    {...register("to")}
                    disabled={!selectedFolder}
                    placeholder="destinataire@exemple.com"
                    className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                    focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                    transition-all disabled:opacity-60 placeholder:text-gray-100"
                  />
                  {errors.to && (
                    <p className="text-xs text-red-500">{errors.to.message}</p>
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Objet
                  </span>
                  <input
                    type="text"
                    {...register("subject")}
                    disabled={!selectedFolder}
                    className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                    focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                    transition-all disabled:opacity-60"
                  />
                  {errors.subject && (
                    <p className="text-xs text-red-500">
                      {errors.subject.message}
                    </p>
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Message
                  </span>
                  <textarea
                    {...register("body")}
                    disabled={!selectedFolder}
                    rows={10}
                    className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                    focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                    transition-all disabled:opacity-60"
                  />
                  {errors.body && (
                    <p className="text-xs text-red-500">
                      {errors.body.message}
                    </p>
                  )}
                </label>

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setValue("action", "draft");
                      handleSubmit(submit)();
                    }}
                    disabled={!selectedFolder || !isValid || sending}
                    className="px-6 py-2.5 bg-slate-300 text-slate-800 font-semibold 
                    rounded-xl shadow-lg shadow-slate-300/30 hover:shadow-slate-300/50 
                    hover:bg-slate-400 transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {sending ? "⏳ En cours..." : "Mettre en brouillon"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("action", "send");
                      handleSubmit(submit)();
                    }}
                    disabled={!selectedFolder || !isValid || sending}
                    className="px-6 py-2.5 bg-linear-to-r from-sky-400 to-sky-500 text-white font-semibold 
                    rounded-xl shadow-lg shadow-sky-400/30 hover:shadow-sky-400/50 
                    hover:from-sky-500 hover:to-sky-600 transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {sending ? "⏳ En cours..." : "Envoyer"}
                  </button>
                </div>

                {log && (
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                      {log}
                    </pre>
                  </div>
                )}
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="px-6 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-sky-500 mb-1">
        Pipeline
      </p>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Envoyer des emails
      </h2>
      <p className="text-slate-500">
        Choisissez un centre (dossier de sortie) puis remplissez le formulaire.
      </p>
    </header>
  );
}

function NavFolders({
  selectedFolder,
  onSelectFolder,
}: {
  selectedFolder: string | null;
  onSelectFolder: (folder: string) => void;
}) {
  const { outputDir } = useOutputDir();
  const { folders, loading, log: initialLog } = useOutputFolders(outputDir);

  return (
    <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-slate-200">
        <p className="text-sm font-semibold text-slate-800">Centres</p>
        <p className="text-xs text-slate-500 truncate">
          {outputDir ? outputDir : "outputDir non configuré"}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="p-3 text-sm text-slate-500">Chargement…</div>
        ) : folders.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">Aucun dossier.</div>
        ) : (
          <ul className="space-y-1">
            {folders.map((f) => {
              const active = f === selectedFolder;
              return (
                <li key={f}>
                  <button
                    type="button"
                    onClick={() => onSelectFolder(f)}
                    className={
                      "w-full text-left px-3 py-2 rounded-lg transition-all " +
                      (active
                        ? "bg-sky-100 text-sky-900 border border-sky-200"
                        : "hover:bg-slate-100 text-slate-800 border border-transparent")
                    }
                  >
                    <span className="text-sm font-medium wrap-break-word">
                      {f}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}

function PieceJointeList({
  loadingFiles,
  files,
  selectedFolder,
}: {
  loadingFiles: boolean;
  files: string[];
  selectedFolder: string | null;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-800">Pièces jointes</p>
        {loadingFiles && (
          <span className="text-xs text-slate-500">Chargement…</span>
        )}
      </div>
      {selectedFolder ? (
        files.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-700">
            {files.map((file) => (
              <li key={file} className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full bg-sky-400"
                  aria-hidden
                />
                <span className="truncate" title={file}>
                  {file}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            Aucune pièce jointe trouvée dans ce dossier.
          </p>
        )
      ) : (
        <p className="text-sm text-slate-500">
          Sélectionnez un centre pour voir les pièces jointes.
        </p>
      )}
    </div>
  );
}
