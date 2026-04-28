import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in BE/.env. " +
      "Auth/storage operations will fail until these are set."
  );
}

// Server-side admin client (bypasses RLS — only for trusted backend use)
export const supabaseAdmin = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Anon client — used when verifying user tokens forwarded from FE
export const supabaseAnon = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY ?? ""
);
