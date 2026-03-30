import { createSupabaseAdminClient } from "./supabase";

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

export type SupabasePatientReferenceRow = {
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
  nom: string | null | undefined,
): string | null {
  const parts = [prenom, nom]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  return parts.length > 0 ? parts.join(" ") : null;
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

function buildPumpLabelFromAssignment(row: SupabasePatientAssignmentRow): string | null {
  const material = getSingleValue<SupabaseRelatedMaterialRow>(row.materiels);
  const stockReference = getSingleValue<SupabaseRelatedStockReferenceRow>(
    row.stock_references,
  );

  return [
    material?.designation?.trim() || null,
    stockReference?.code_reference?.trim() || null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" - ")
    .trim() || null;
}

export async function getSupabasePatientReferenceRows(): Promise<SupabasePatientReferenceRow[]> {
  const supabase = await createSupabaseAdminClient();

  const [
    { data: patientsData, error: patientsError },
    { data: devicesData },
    { data: pumpHistoryData },
    { data: assignmentsData },
    { data: contactsData },
    { data: materialsData },
  ] = await Promise.all([
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
        "patient_id, assigned_on, created_at, materiels(designation), stock_references(code_reference)",
      )
      .eq("status", "ACTIVE")
      .eq("assignment_kind", "POMPE_PRINCIPALE")
      .order("patient_id", { ascending: true })
      .order("assigned_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("contacts_medical")
      .select(
        "patient_id, personnel_sante(prenom, nom, fonction, telephone, fonction_ref:personnel_sante_fonctions!personnel_sante_fonction_id_fkey(label, is_medecin)), etablissements_medicaux(nom, adresse, code_postal, ville)",
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
      contact.personnel_sante,
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
        contact.etablissements_medicaux,
      );
      prescripteurByPatientId.set(contact.patient_id, {
        prescripteur: currentFullName,
        centreInitiateur: etablissement?.nom?.trim() || null,
      });
    }
  }

  return typedPatientsData.map((patient) => {
    const medicalDevice = medicalDeviceByPatientId.get(patient.id);
    const pumpLabelFromAssignment = pumpLabelByPatientId.get(patient.id) ?? null;
    const pumpLabelFromDevice = medicalDevice?.pompe_modele
      ? (materialNameById.get(medicalDevice.pompe_modele) ?? null)
      : null;
    const pumpLabel = pumpLabelFromAssignment || pumpLabelFromDevice || "";
    const capteurLabel = medicalDevice?.capteur
      ? (materialNameById.get(medicalDevice.capteur) ?? null)
      : null;
    const prescripteur = prescripteurByPatientId.get(patient.id);

    return {
      id: patient.id,
      nom: patient.nom ?? "",
      prenom: patient.prenom ?? "",
      date_naissance: formatSupabaseDate(patient.date_naissance),
      type_pompe: pumpLabel,
      type_capteur: capteurLabel ?? "",
      dlp_pompe: latestPumpDlpByPatientId.get(patient.id) ?? "",
      prescripteur: prescripteur?.prescripteur ?? "",
      centre_initiateur: prescripteur?.centreInitiateur ?? "",
    };
  });
}

export function filterSupabasePatientReferenceRowsByDate(
  rows: SupabasePatientReferenceRow[],
  dateFrom?: string,
  dateTo?: string,
): SupabasePatientReferenceRow[] {
  if (!dateFrom || !dateTo) {
    return rows;
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  return rows.filter((patient) => {
    const date = parseComparableDate(patient.dlp_pompe);
    if (!date) return false;
    return date >= from && date <= to;
  });
}
