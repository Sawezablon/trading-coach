import Link from "next/link";

import { APP_CONFIG } from "@/config/app-config";

import { ForgotPasswordForm } from "../../_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">Reset your password</h1>
          <p className="text-muted-foreground text-sm">We&apos;ll email you a secure reset link.</p>
        </div>
        <ForgotPasswordForm />
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Remembered it?{" "}
          <Link prefetch={false} className="text-foreground" href="/auth/v2/login">
            Login
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">ENG</div>
      </div>
    </>
  );
}
