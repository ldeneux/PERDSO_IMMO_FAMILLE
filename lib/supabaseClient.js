"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes. Voir .env.local.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: "immobilier",
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
