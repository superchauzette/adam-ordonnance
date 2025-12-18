import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FilePicker } from "../components/FilePicker";
import { FolderPicker } from "../components/FolderPicker";

type GenerateOrdersScreenProps = {};

const formSchema = z
  .object({
    dateFrom: z.string().min(1, "Date de début requise"),
    dateTo: z.string().min(1, "Date de fin requise"),
    ordersFilePath: z.string().min(1, "Fichier ordonnances requis"),
    outputDir: z.string().min(1, "Dossier de sortie requis"),
  })
  .refine(({ dateFrom, dateTo }) => new Date(dateFrom) <= new Date(dateTo), {
    path: ["dateTo"],
    message: "La date de fin doit être après la date de début.",
  });

type FormValues = z.infer<typeof formSchema>;

export function GenerateOrdersScreen({}: GenerateOrdersScreenProps) {
  const [log, setLog] = useState("Prêt à générer les ordonnances...");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
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
      ordersFilePath: "",
      outputDir: "",
    },
  });

  // Load saved outputDir on mount
  useEffect(() => {
    const loadOutputDir = async () => {
      const savedOutputDir = await window.settingsAPI.get("outputDir");
      if (savedOutputDir) {
        setValue("outputDir", savedOutputDir as string);
      }
    };
    loadOutputDir();
  }, [setValue]);

  const values = watch();
  const ordersFileName = values.ordersFilePath
    ? values.ordersFilePath.split(/[\\/]/).pop() || values.ordersFilePath
    : "";

  const submit = async (data: FormValues) => {
    setLog("🔄 Génération en cours...\n");

    try {
      const result = await window.api.generateOrdonnances(
        data.ordersFilePath,
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
            `Excel ordonnances: ${ordersFileName || data.ordersFilePath}`,
            `Dossier de sortie: ${data.outputDir}`,
            `Nombre d'ordonnances générées: ${result.nbPatients || 0}`,
          ].join("\n")
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
          Sélectionnez la période, les fichiers Excel et le dossier de sortie.
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

          {/* Orders File */}
          <div>
            <FilePicker
              label="Fichier ordonnances (Excel)"
              value={values.ordersFilePath}
              onChange={(path) =>
                setValue("ordersFilePath", path, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              error={errors.ordersFilePath?.message}
            />
            <input type="hidden" {...register("ordersFilePath")} />
          </div>

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
    </div>
  );
}
