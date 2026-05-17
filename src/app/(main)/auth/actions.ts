"use server";

import { redirect } from "next/navigation";

import { env, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthState = {
  error?: string;
  message?: string;
};

function authCallbackUrl(next = "/dashboard") {
  return `${env.appUrl}/auth/callback?next=${encodeURIComponent(next)}`;
}

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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authCallbackUrl(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message: "Check your email to confirm your account. The confirmation link will bring you back to Qyvex Edge.",
  };
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
      redirectTo: authCallbackUrl(),
    },
  });

  if (error || !data.url) {
    redirect("/auth/v2/login");
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return { error: "Add Supabase environment variables to enable password reset." };
  }

  const email = String(formData.get("email") ?? "");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl("/auth/v2/reset-password"),
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message: "Password reset email sent. Open the link in your email to choose a new password.",
  };
}

export async function updatePasswordAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return { error: "Add Supabase environment variables to enable password reset." };
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
