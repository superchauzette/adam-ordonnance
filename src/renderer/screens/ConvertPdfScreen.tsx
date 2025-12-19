import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderPicker } from "../components/FolderPicker";

const formSchema = z.object({
  inputDocx: z.string().min(1, "Dossier Word requis"),
  outputPdf: z.string().min(1, "Dossier PDF requis"),
});

type FormValues = z.infer<typeof formSchema>;

export function ConvertPdfScreen() {
  const [log, setLog] = useState(
    "Prêt à convertir les documents Word en PDF..."
  );
  const [isConverting, setIsConverting] = useState(false);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      inputDocx: "",
      outputPdf: "",
    },
  });

  const values = watch();

  const submit = async (data: FormValues) => {
    setLog("🔄 Conversion en cours...\n");
    setIsConverting(true);

    try {
      const result = await window.api.wordToPdf(data.inputDocx, data.outputPdf);

      if (result.success) {
        setLog(
          [
            "✅ Conversion terminée avec succès!",
            `Dossier Word: ${data.inputDocx}`,
            `Dossier PDF: ${data.outputPdf}`,
            `Fichier généré: ${result.pdfPath || "N/A"}`,
          ].join("\n")
        );
      } else {
        setLog(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setLog(`❌ Erreur lors de la conversion: ${error}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-500 mb-1">
          Pipeline
        </p>
        <h1 className="text-2xl font-bold text-slate-800">
          Convertir Word en PDF
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Convertir les documents Word (.docx) en fichiers PDF.
        </p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
          <FolderPicker
            label="Dossier des fichiers Word (.docx)"
            value={values.inputDocx}
            onChange={(path) =>
              setValue("inputDocx", path, { shouldValidate: true })
            }
            placeholder="Sélectionner le dossier contenant les fichiers Word"
            error={errors.inputDocx?.message}
          />

          <FolderPicker
            label="Dossier de sortie PDF"
            value={values.outputPdf}
            onChange={(path) =>
              setValue("outputPdf", path, { shouldValidate: true })
            }
            placeholder="Sélectionner le dossier pour les fichiers PDF"
            error={errors.outputPdf?.message}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || isConverting}
          className={
            "w-full px-6 py-3 rounded-lg font-semibold text-white transition " +
            (isValid && !isConverting
              ? "bg-sky-500 hover:bg-sky-600"
              : "bg-slate-300 cursor-not-allowed")
          }
        >
          {isConverting ? "Conversion en cours..." : "Convertir en PDF"}
        </button>
      </form>

      {/* Log Panel */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Log</h3>
        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
          {log}
        </pre>
      </div>
    </div>
  );
}
