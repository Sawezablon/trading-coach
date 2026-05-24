"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PasswordRecoverySession() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeRecoverySession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) {
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);
    }

    void initializeRecoverySession();
  }, []);

  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
