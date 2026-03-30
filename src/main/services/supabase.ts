import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { settings } from "../settings";

type SupabaseCredentials = {
  url: string;
  serviceRoleKey: string;
};

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export async function resolveSupabaseCredentials(): Promise<SupabaseCredentials | null> {
  const [storedUrl, storedServiceRoleKey] = await Promise.all([
    settings.get("supabaseUrl"),
    settings.get("supabaseServiceRoleKey"),
  ]);

  const url =
    (typeof storedUrl === "string" ? storedUrl.trim() : "") ||
    readEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    (typeof storedServiceRoleKey === "string"
      ? storedServiceRoleKey.trim()
      : "") ||
    readEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export async function createSupabaseAdminClient(): Promise<SupabaseClient> {
  const credentials = await resolveSupabaseCredentials();

  if (!credentials) {
    throw new Error(
      "Connexion Supabase manquante. Renseignez l'URL et la clé service role dans les paramètres.",
    );
  }

  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function hasSupabaseCredentials(): Promise<boolean> {
  return Boolean(await resolveSupabaseCredentials());
}
