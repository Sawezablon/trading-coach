"use client";

import { useActionState } from "react";

import { updatePasswordAction } from "@/app/(main)/auth/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup className="gap-4">
        <Field className="gap-1.5">
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
            name="password"
            type="password"
            placeholder="********"
            autoComplete="new-password"
            required
            minLength={6}
          />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="reset-confirm-password">Confirm password</FieldLabel>
          <Input
            id="reset-confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="********"
            autoComplete="new-password"
            required
            minLength={6}
          />
        </Field>
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Updating password..." : "Update password"}
      </Button>
    </form>
  );
}
