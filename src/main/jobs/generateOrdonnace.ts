import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import os from "os";

type PatientData = {
  Nom: string;
  Prénom: string;
  "Date naissance"?: string;
  "Type de pompe"?: string;
  "Type de capteur"?: string;
  "Dlp Pompe"?: string | number;
  Prescripteur?: string;
  "Centre initiateur"?: string;
};

type Patient = {
  nom: string;
  prenom: string;
  date_naissance?: string;
  type_pompe?: string;
  type_capteur?: string;
  dlp_pompe?: string | number;
  prescripteur?: string;
  centre_initiateur?: string;
};

type CorrespondanceEntry = {
  typePompe: string;
  typeCapteur: string;
  template: string;
};

type WorkerFn<T, R> = (item: T, index: number) => Promise<R>;

const TEMPLATE_CACHE = new Map<string, string>();

function getTemplateBinary(templatePath: string): string {
  const abs = path.resolve(templatePath);
  const cached = TEMPLATE_CACHE.get(abs);
  if (cached) return cached;
  const bin = fs.readFileSync(abs, "binary");
  TEMPLATE_CACHE.set(abs, bin);
  return bin;
}

function safeFilename(name: string): string {
  // Replace forbidden filename characters across platforms, and collapse whitespace
  return String(name)
    .replace(/[\\/]/g, "-")
    .replace(/[:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getConcurrency(): number {
  const v = Number(process.env.CONCURRENCY || "0");
  if (Number.isFinite(v) && v > 0) return Math.max(1, Math.floor(v));
  const cpu = os.cpus?.().length || 2;
  return Math.min(4, Math.max(1, cpu));
}

async function promisePool<T, R>(
  items: T[],
  worker: WorkerFn<T, R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function runOne(): Promise<void> {
    while (true) {
      const current = idx++;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    runOne
  );
  await Promise.all(runners);
  return results;
}

function readExcel<T>(file: string): T[] {
  const wb = xlsx.readFile(file, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json<T>(ws, { defval: "" });
}

function renderDocx(templatePath: string, data: Patient): Buffer {
  const content = getTemplateBinary(templatePath);
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}

function formatDate(d: unknown): string {
  if (!d) return "";
  return new Date(d as string | number).toLocaleDateString("fr-FR");
}

function getTemplateForPatient(
  patient: Patient,
  correspondances: CorrespondanceEntry[]
): string {
  const pompe = String(patient.type_pompe || "").trim();
  const capteur = String(patient.type_capteur || "").trim();
  // Try exact match (pompe + capteur)
  let match = correspondances.find(
    (c) => c.typePompe === pompe && c.typeCapteur === capteur
  );
  if (match) return match.template;

  // Fallback: pompe without capteur
  match = correspondances.find((c) => c.typePompe === pompe && !c.typeCapteur);
  if (match) return match.template;

  // Fallback: only capteur
  match = correspondances.find(
    (c) => !c.typePompe && c.typeCapteur === capteur
  );
  if (match) return match.template;

  // Default fallback
  return "ORDO_Pompe_seule.docx";
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(" de ", " ")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
    .replace(/\s+/g, "_")
    .trim();
}

function normalizePatientKeys(patient: PatientData): Patient {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patient)) {
    const normalizedKey = normalizeKey(key);
    normalized[normalizedKey] = value;
  }

  return normalized as Patient;
}

export async function generateOrdonnances(
  inputFile: string = "src/data/patients.xlsx",
  outputDir: string = "output/ordonnances",
  dateFrom?: string,
  dateTo?: string
) {
  const correspondanceFile = "src/templates/correspondance-type-ordo.xlsx";
  const templateDir = "src/templates/type-ordonance";

  const patients = readExcel<PatientData>(inputFile);
  const correspondances = readExcel<CorrespondanceEntry>(correspondanceFile);

  fs.mkdirSync(outputDir, { recursive: true });

  const list = patients
    .map(normalizePatientKeys)
    .filter((p) => p.nom && p.prenom)
    .filter((p) => {
      if (!dateFrom || !dateTo) return true;

      const from = new Date(dateFrom);
      const to = new Date(dateTo);

      const dlpPompe = p.dlp_pompe;
      if (!dlpPompe) return false;

      // Convertir en date (peut être un nombre Excel ou une string)
      let date: Date;
      if (typeof dlpPompe === "number") {
        // Excel date: nombre de jours depuis 1900-01-01
        date = new Date((dlpPompe - 25569) * 86400 * 1000);
      } else {
        date = new Date(dlpPompe);
      }

      return date >= from && date <= to;
    });

  console.log(`ℹ️ Filtré par date: ${dateFrom} → ${dateTo}`);

  const concurrency = getConcurrency();
  console.log(`ℹ️ Patients: ${list.length} | Concurrency: ${concurrency}`);

  await promisePool(
    list,
    async (patient) => {
      
      patient.dlp_pompe = formatDate(patient.dlp_pompe)
      const templateName = getTemplateForPatient(patient, correspondances);
      const templatePath = `${templateDir}/${templateName}`;

      const docxBuf = renderDocx(templatePath, patient);
      const base = safeFilename(`${patient.nom}_${patient.prenom}`);

      // Organize by "Centre initiateur"
      const centre = safeFilename(
        patient.prescripteur || "prescripteur_inconnu"
      );
      const centreDir = path.join(outputDir, centre);
      fs.mkdirSync(centreDir, { recursive: true });

      const outputPath = path.join(centreDir, `${base}.docx`);

      fs.writeFileSync(outputPath, docxBuf);
      console.log(`✅ ${centre}/${base}.docx (${templateName})`);
    },
    concurrency
  );

  return { success: true, nbPatients: list.length };
}
