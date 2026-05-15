export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://qyvexedge.com",
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
