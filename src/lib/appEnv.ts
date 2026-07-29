export type AppEnv = "local" | "preview" | "production" | "test";

export function getAppEnv(): AppEnv {
  const value = process.env.NEXT_PUBLIC_APP_ENV;
  if (value === "preview" || value === "production" || value === "test") return value;
  return "local";
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDemoModeAllowed() {
  return (
    process.env.NODE_ENV === "development" &&
    getAppEnv() === "local" &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true"
  );
}

export function shouldUseSupabase() {
  return isSupabaseConfigured();
}

export function getRuntimeConfigurationError() {
  if (shouldUseSupabase()) return "";
  if (isDemoModeAllowed()) return "";
  return "Supabase環境変数が未設定です。Preview/Productionではデモモードを使用できません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。";
}

export function assertBetaRuntimeReady() {
  const error = getRuntimeConfigurationError();
  if (error) throw new Error(error);
}
