import { env } from "@/lib/env";

export function getAdminEmails() {
  return env.adminEmails
    .split(/[,\n;]/)
    .map((email) =>
      email
        .trim()
        .replace(/^["']|["']$/g, "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
}
