import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import os from "os";
import {
  createSupabaseAdminClient,
  hasSupabaseCredentials,
} from "../services/supabase";

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

type SupabasePatientRow = {
  id: string;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
};

type SupabaseMedicalDeviceRow = {
  patient_id: string;
  pompe_modele: string | null;
  capteur: string | null;
};

type SupabasePumpHistoryRow = {
  patient_id: string;
  pump_dlp: string | null;
  changed_on: string | null;
  created_at: string;
};

type SupabaseMaterialRow = {
  id: string;
  designation: string | null;
};

type SupabaseRelatedMaterialRow = {
  designation: string | null;
};

type SupabaseRelatedStockReferenceRow = {
  code_reference: string | null;
};

type SupabaseRelatedFunctionRow = {
  label: string | null;
  is_medecin: boolean | null;
};

type SupabaseRelatedPersonnelRow = {
  prenom: string | null;
  nom: string | null;
  fonction: string | null;
  telephone: string | null;
  fonction_ref?: SupabaseRelatedFunctionRow | SupabaseRelatedFunctionRow[] | null;
};

type SupabaseRelatedEtablissementRow = {
  nom: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
};

type SupabasePatientAssignmentRow = {
  patient_id: string;
  materiels: SupabaseRelatedMaterialRow | SupabaseRelatedMaterialRow[] | null;
  stock_references:
    | SupabaseRelatedStockReferenceRow
    | SupabaseRelatedStockReferenceRow[]
    | null;
};

type SupabasePatientContactRow = {
  patient_id: string;
  personnel_sante: SupabaseRelatedPersonnelRow | SupabaseRelatedPersonnelRow[] | null;
  etablissements_medicaux:
    | SupabaseRelatedEtablissementRow
    | SupabaseRelatedEtablissementRow[]
    | null;
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

function getSingleValue<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeComparable(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "");
}

function isMedecinFunction(value: {
  label: string | null;
  is_medecin: boolean | null;
} | null): boolean {
  if (!value) return false;

  const normalized = normalizeComparable(value.label);
  return (
    value.is_medecin === true ||
    normalized.includes("medecin") ||
    normalized.includes("diabetologue") ||
    normalized.includes("endocrinologue")
  );
}

function buildDisplayName(
  prenom: string | null | undefined,
  nom: string | null | undefined
): string | null {
  const parts = [prenom, nom]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  return parts.length > 0 ? parts.join(" ") : null;
}

function buildPumpLabelFromAssignment(row: SupabasePatientAssignmentRow): string | null {
  const material = getSingleValue<SupabaseRelatedMaterialRow>(
    row.materiels as SupabaseRelatedMaterialRow | SupabaseRelatedMaterialRow[] | null,
  );
  const stockReference = getSingleValue<SupabaseRelatedStockReferenceRow>(
    row.stock_references as
      | SupabaseRelatedStockReferenceRow
      | SupabaseRelatedStockReferenceRow[]
      | null,
  );

  return [
    material?.designation?.trim() || null,
    stockReference?.code_reference?.trim() || null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" - ")
    .trim() || null;
}

function buildPumpLabelFromMedicalDevice(
  device: SupabaseMedicalDeviceRow | undefined,
  materialNameById: Map<string, string>
): string | null {
  if (!device?.pompe_modele) {
    return null;
  }

  return materialNameById.get(device.pompe_modele) ?? null;
}

function formatSupabaseDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("fr-FR");
}

function parseComparableDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return new Date((value - 25569) * 86400 * 1000);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function generateOrdonnancesFromSupabase(
  outputDir: string,
  dateFrom?: string,
  dateTo?: string,
  templateDir: string = "src/templates"
) {
  const supabase = await createSupabaseAdminClient();
  const correspondanceFile = path.resolve(
    templateDir,
    "correspondance-type-ordo.xlsx"
  );
  const typeOrdoDir = path.resolve(templateDir, "type-ordonance");

  const [{ data: patientsData, error: patientsError }, { data: devicesData }, { data: pumpHistoryData }, { data: assignmentsData }, { data: contactsData }, { data: materialsData }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id, nom, prenom, date_naissance")
        .order("nom", { ascending: true })
        .order("prenom", { ascending: true }),
      supabase.from("medical_devices").select("patient_id, pompe_modele, capteur"),
      supabase
        .from("patient_pump_history")
        .select("patient_id, pump_dlp, changed_on, created_at")
        .order("patient_id", { ascending: true })
        .order("changed_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("patient_material_assignments")
        .select(
          "patient_id, assigned_on, created_at, materiels(designation), stock_references(code_reference)"
        )
        .eq("status", "ACTIVE")
        .eq("assignment_kind", "POMPE_PRINCIPALE")
        .order("patient_id", { ascending: true })
        .order("assigned_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("contacts_medical")
        .select(
          "patient_id, personnel_sante(prenom, nom, fonction, telephone, fonction_ref:personnel_sante_fonctions!personnel_sante_fonction_id_fkey(label, is_medecin)), etablissements_medicaux(nom, adresse, code_postal, ville)"
        )
        .order("patient_id", { ascending: true })
        .order("id", { ascending: true }),
      supabase.from("materiels").select("id, designation"),
    ]);

  if (patientsError) {
    throw new Error(patientsError.message);
  }

  const typedPatientsData = (patientsData ?? []) as SupabasePatientRow[];
  const patientIds = typedPatientsData.map((patient) => patient.id);
  const patientIdSet = new Set(patientIds);
  const materialNameById = new Map(
    (materialsData ?? []).map((material: SupabaseMaterialRow) => [
      material.id,
      material.designation?.trim() || "",
    ]),
  );

  const latestPumpDlpByPatientId = new Map<string, string | null>();
  for (const row of pumpHistoryData ?? []) {
    const history = row as SupabasePumpHistoryRow;
    if (!patientIdSet.has(history.patient_id)) {
      continue;
    }

    if (!latestPumpDlpByPatientId.has(history.patient_id)) {
      latestPumpDlpByPatientId.set(history.patient_id, history.pump_dlp ?? null);
    }
  }

  const pumpLabelByPatientId = new Map<string, string | null>();
  for (const row of assignmentsData ?? []) {
    const assignment = row as unknown as SupabasePatientAssignmentRow;
    if (!patientIdSet.has(assignment.patient_id)) {
      continue;
    }

    if (!pumpLabelByPatientId.has(assignment.patient_id)) {
      pumpLabelByPatientId.set(
        assignment.patient_id,
        buildPumpLabelFromAssignment(assignment),
      );
    }
  }

  const medicalDeviceByPatientId = new Map<string, SupabaseMedicalDeviceRow>();
  for (const row of devicesData ?? []) {
    const device = row as SupabaseMedicalDeviceRow;
    if (!patientIdSet.has(device.patient_id)) {
      continue;
    }

    if (!medicalDeviceByPatientId.has(device.patient_id)) {
      medicalDeviceByPatientId.set(device.patient_id, device);
    }
  }

  const prescripteurByPatientId = new Map<
    string,
    { prescripteur: string | null; centreInitiateur: string | null }
  >();
  for (const row of contactsData ?? []) {
    const contact = row as unknown as SupabasePatientContactRow;
    if (!patientIdSet.has(contact.patient_id)) {
      continue;
    }

    const existing = prescripteurByPatientId.get(contact.patient_id);
    const personnel = getSingleValue<SupabaseRelatedPersonnelRow>(
      contact.personnel_sante as
        | SupabaseRelatedPersonnelRow
        | SupabaseRelatedPersonnelRow[]
        | null,
    );
    const fonctionRef = getSingleValue<SupabaseRelatedFunctionRow>(
      personnel?.fonction_ref ?? null,
    );
    const currentFullName = buildDisplayName(personnel?.prenom, personnel?.nom);
    const isMedecin = isMedecinFunction(fonctionRef ?? null);

    if (!currentFullName) {
      continue;
    }

    if (!existing || isMedecin) {
      const etablissement = getSingleValue<SupabaseRelatedEtablissementRow>(
        contact.etablissements_medicaux as
          | SupabaseRelatedEtablissementRow
          | SupabaseRelatedEtablissementRow[]
          | null,
      );
      prescripteurByPatientId.set(contact.patient_id, {
        prescripteur: currentFullName,
        centreInitiateur: etablissement?.nom?.trim() || null,
      });
    }
  }

  const correspondances = readExcel<CorrespondanceEntry>(correspondanceFile);

  fs.mkdirSync(outputDir, { recursive: true });

  const list = typedPatientsData
    .map((patient) => {
      const medicalDevice = medicalDeviceByPatientId.get(patient.id);
      const pumpLabelFromAssignment = pumpLabelByPatientId.get(patient.id) ?? null;
      const pumpLabelFromDevice = buildPumpLabelFromMedicalDevice(
        medicalDevice,
        materialNameById,
      );
      const pumpLabel = pumpLabelFromAssignment || pumpLabelFromDevice || "";
      const capteurLabel =
        medicalDevice?.capteur
          ? (materialNameById.get(medicalDevice.capteur) ?? null)
          : null;

      const prescripteur = prescripteurByPatientId.get(patient.id);

      return {
        nom: patient.nom ?? "",
        prenom: patient.prenom ?? "",
        date_naissance: formatSupabaseDate(patient.date_naissance),
        type_pompe: pumpLabel,
        type_capteur: capteurLabel ?? "",
        dlp_pompe: latestPumpDlpByPatientId.get(patient.id) ?? "",
        prescripteur: prescripteur?.prescripteur ?? "",
        centre_initiateur: prescripteur?.centreInitiateur ?? "",
      } satisfies Patient;
    })
    .filter((patient) => patient.nom && patient.prenom)
    .filter((patient) => {
      if (!dateFrom || !dateTo) return true;

      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const date = parseComparableDate(patient.dlp_pompe);
      if (!date) return false;
      return date >= from && date <= to;
    });

  console.log(`ℹ️ Filtré par date: ${dateFrom} → ${dateTo}`);
  const concurrency = getConcurrency();
  console.log(`ℹ️ Patients Supabase: ${list.length} | Concurrency: ${concurrency}`);

  await promisePool(
    list,
    async (patient) => {
      const templateName = getTemplateForPatient(patient, correspondances);
      const templatePath = `${typeOrdoDir}/${templateName}`;

      const docxBuf = renderDocx(templatePath, patient);
      const base = safeFilename(`${patient.nom}_${patient.prenom}`);

      const centre = safeFilename(
        patient.centre_initiateur || patient.prescripteur || "centre_inconnu"
      );
      const centreDir = path.join(outputDir, centre);
      fs.mkdirSync(centreDir, { recursive: true });

      const outputPath = path.join(centreDir, `${base}.docx`);

      fs.writeFileSync(outputPath, docxBuf);
      console.log(`✅ ${centre}/${base}.docx (${templateName})`);
    },
    concurrency
  );

  return { success: true, nbPatients: list.length, source: "supabase" as const };
}

async function generateOrdonnancesFromExcel(
  inputFile: string,
  outputDir: string,
  dateFrom?: string,
  dateTo?: string,
  templateDir: string = "src/templates"
) {
  const correspondanceFile = path.resolve(
    templateDir,
    "correspondance-type-ordo.xlsx"
  );
  const typeOrdoDir = path.resolve(templateDir, "type-ordonance");

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
      patient.dlp_pompe = formatDate(patient.dlp_pompe);
      patient.date_naissance = formatDate(patient.date_naissance);

      const templateName = getTemplateForPatient(patient, correspondances);
      const templatePath = `${typeOrdoDir}/${templateName}`;

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

  return { success: true, nbPatients: list.length, source: "excel" as const };
}

export async function generateOrdonnances(
  inputFile: string = "src/data/patients.xlsx",
  outputDir: string = "output/ordonnances",
  dateFrom?: string,
  dateTo?: string,
  templateDir: string = "src/templates"
) {
  if (await hasSupabaseCredentials()) {
    return generateOrdonnancesFromSupabase(
      outputDir,
      dateFrom,
      dateTo,
      templateDir,
    );
  }

  if (!inputFile) {
    throw new Error(
      "Aucune connexion Supabase détectée et aucun fichier Excel n'a été fourni.",
    );
  }

  return generateOrdonnancesFromExcel(
    inputFile,
    outputDir,
    dateFrom,
    dateTo,
    templateDir,
  );
}
