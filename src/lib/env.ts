const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qyvexedge.com";
const mt5SyncUrl = process.env.NEXT_PUBLIC_MT5_SYNC_URL ?? "https://sync.qyvexedge.com/api/mt5/sync";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  appUrl,
  mt5SyncUrl,
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
