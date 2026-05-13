"use server";

import { redirect } from "next/navigation";

import { env, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthState = {
  error?: string;
};

export async function loginAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return { error: "Add Supabase environment variables to enable authentication." };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function registerAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return { error: "Add Supabase environment variables to enable signup." };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/auth/v2/login");
}

export async function googleLoginAction() {
  if (!hasSupabaseEnv()) {
    redirect("/auth/v2/login");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/auth/v2/login");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.appUrl}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/auth/v2/login");
  }

  redirect(data.url);
}
