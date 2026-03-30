import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderPicker } from "../components/FolderPicker";

type GenerateOrdersScreenProps = {};

const formSchema = z
  .object({
    dateFrom: z.string().min(1, "Date de début requise"),
    dateTo: z.string().min(1, "Date de fin requise"),
    outputDir: z.string().min(1, "Dossier de sortie requis"),
  })
  .refine(({ dateFrom, dateTo }) => new Date(dateFrom) <= new Date(dateTo), {
    path: ["dateTo"],
    message: "La date de fin doit être après la date de début.",
  });

type FormValues = z.infer<typeof formSchema>;

export function GenerateOrdersScreen({}: GenerateOrdersScreenProps) {
  const [log, setLog] = useState("Prêt à générer les ordonnances...");
  const [patientReferenceRows, setPatientReferenceRows] = useState<
    SupabasePatientReferenceRow[]
  >([]);
  const [patientReferenceLoading, setPatientReferenceLoading] = useState(false);
  const [patientReferenceError, setPatientReferenceError] = useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0], // debut du mois en cours
      dateTo: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        .toISOString()
        .split("T")[0], // fin du mois en cours
      outputDir: "",
    },
  });
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);
  const dateFrom = watch("dateFrom");
  const dateTo = watch("dateTo");

  // Load saved outputDir on mount
  useEffect(() => {
    const loadSettings = async () => {
      const [savedOutputDir, supabaseUrl, supabaseServiceRoleKey] =
        await Promise.all([
          window.settingsAPI.get("outputDir"),
          window.settingsAPI.get("supabaseUrl"),
          window.settingsAPI.get("supabaseServiceRoleKey"),
        ]);

      if (savedOutputDir) {
        setValue("outputDir", savedOutputDir as string);
      }

      setSupabaseReady(
        Boolean(
          typeof supabaseUrl === "string" &&
            supabaseUrl.trim() &&
            typeof supabaseServiceRoleKey === "string" &&
            supabaseServiceRoleKey.trim(),
        ),
      );
    };
    loadSettings();
  }, [setValue]);

  useEffect(() => {
    const loadPatientReference = async () => {
      if (supabaseReady === null) {
        return;
      }

      if (!supabaseReady) {
        setPatientReferenceRows([]);
        setPatientReferenceError(
          "Configurez Supabase dans Paramètres pour afficher le référentiel patients.",
        );
        return;
      }

      setPatientReferenceLoading(true);
      setPatientReferenceError(null);

      try {
        const result = (await window.api.listSupabasePatientReference(
          dateFrom,
          dateTo,
        )) as
          | { success: true; rows: SupabasePatientReferenceRow[] }
          | { success: false; rows: []; error?: string };

        if (!result.success) {
          setPatientReferenceRows([]);
          setPatientReferenceError(
            result.error || "Impossible de charger le référentiel patients.",
          );
          return;
        }

        setPatientReferenceRows(result.rows);
      } catch (error) {
        setPatientReferenceRows([]);
        setPatientReferenceError(
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setPatientReferenceLoading(false);
      }
    };

    loadPatientReference();
  }, [dateFrom, dateTo, supabaseReady]);

  const values = watch();

  const submit = async (data: FormValues) => {
    setLog(
      supabaseReady === false
        ? "⚠️ Connexion Supabase non configurée dans les paramètres. Tentative de génération avec les variables d'environnement éventuelles...\n"
        : "🔄 Génération en cours depuis Supabase...\n",
    );

    try {
      const result = await window.api.generateOrdonnances(
        "",
        data.outputDir,
        data.dateFrom,
        data.dateTo
      );

      await window.settingsAPI.set("outputDir", data.outputDir);

      if (result.success) {
        setLog(
          [
            "✅ Génération terminée avec succès!",
            `Période: ${data.dateFrom} → ${data.dateTo}`,
            "Source patients: Supabase",
            `Dossier de sortie: ${data.outputDir}`,
            `Nombre d'ordonnances générées: ${result.nbPatients || 0}`,
          ].join("\n"),
        );
      } else {
        setLog(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setLog(`❌ Erreur lors de la génération: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-500 mb-1">
          Pipeline
        </p>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Générer les ordonnances
        </h2>
        <p className="text-slate-500">
          Sélectionnez la période et le dossier de sortie. Les patients sont
          récupérés directement depuis Supabase.
        </p>
      </header>

      {/* Form Panel */}
      <form
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-6"
        onSubmit={handleSubmit(submit)}
      >
        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Date From */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Du</span>
            <input
              type="date"
              {...register("dateFrom")}
              className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                transition-all"
            />
            {errors.dateFrom && (
              <p className="text-xs text-red-500">{errors.dateFrom.message}</p>
            )}
          </label>

          {/* Date To */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Au</span>
            <input
              type="date"
              {...register("dateTo")}
              className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white
                transition-all"
            />
            {errors.dateTo && (
              <p className="text-xs text-red-500">{errors.dateTo.message}</p>
            )}
          </label>

          {/* Output Directory */}
          <div>
            <FolderPicker
              label="Dossier de sortie"
              value={values.outputDir}
              onChange={(path) =>
                setValue("outputDir", path, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              error={errors.outputDir?.message}
            />
            <input type="hidden" {...register("outputDir")} />
          </div>
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            supabaseReady
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {supabaseReady === null
            ? "Vérification de la connexion Supabase..."
            : supabaseReady
              ? "Connexion Supabase prête. La génération utilisera le référentiel patients."
              : "Connexion Supabase absente. Configurez l'URL et la clé service role dans Paramètres."}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-semibold 
              rounded-xl shadow-lg shadow-sky-400/30 hover:shadow-sky-400/50 
              hover:from-sky-500 hover:to-sky-600 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Générer
          </button>
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <textarea
            readOnly
            value={log}
            spellCheck={false}
            className="w-full h-40 px-4 py-3 rounded-xl bg-slate-900 text-slate-300 
              font-mono text-sm resize-y border border-slate-700
              focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </form>

      <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-500 mb-1">
            Référentiel Supabase
          </p>
          <h3 className="text-lg font-semibold text-slate-800">
            Patients utilisés pour la génération
          </h3>
          <p className="text-sm text-slate-500">
            Tableau synchronisé avec la même source que le moteur de génération.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-400">
            {patientReferenceRows.length} patient
            {patientReferenceRows.length > 1 ? "s" : ""} chargé
            {patientReferenceRows.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="px-6 py-5">
          {patientReferenceLoading ? (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="h-3 w-3 animate-pulse rounded-full bg-sky-400" />
              Chargement du référentiel patients...
            </div>
          ) : patientReferenceError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {patientReferenceError}
            </div>
          ) : patientReferenceRows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Aucun patient trouvé pour la période sélectionnée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-3 py-3 font-semibold">
                      Patient
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 font-semibold">
                      Date naissance
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 font-semibold">
                      DLP pompe
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 font-semibold">
                      Type pompe
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 font-semibold">
                      Type capteur
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 font-semibold">
                      Prescripteur
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 font-semibold">
                      Centre initiateur
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patientReferenceRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">
                          {row.nom} {row.prenom}
                        </div>
                        <div className="text-xs text-slate-500">{row.id}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {row.date_naissance || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {row.dlp_pompe || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {row.type_pompe || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {row.type_capteur || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {row.prescripteur || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {row.centre_initiateur || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
