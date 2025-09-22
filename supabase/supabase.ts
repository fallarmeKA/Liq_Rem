import { createClient } from "@supabase/supabase-js";

// Load from Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Safety check to avoid empty values
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment variables are missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Quick connection test (runs once at startup) ---
supabase.from("users").select("*").limit(1).then((res) => {
  if (res.error) {
    console.error("❌ Supabase connection failed:", res.error.message);
  } else {
    console.log("✅ Supabase connected! Test query:", res.data);
  }
});
