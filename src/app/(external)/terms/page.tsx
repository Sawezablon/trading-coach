import type { Metadata } from "next";

import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Terms | Qyvex Edge",
  description: "Terms of use for Qyvex Edge.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Use"
      sections={[
        {
          title: "Use of Qyvex Edge",
          body: (
            <p>
              Qyvex Edge is a trading discipline journal and review tool. You are responsible for your account, journal
              content, trading decisions, and compliance with laws, broker rules, and prop firm rules that apply to you.
            </p>
          ),
        },
        {
          title: "No trading execution",
          body: (
            <p>
              Qyvex Edge does not place, modify, or close trades. The MT5 Expert Advisor is intended only to read trade
              history and send journal data into your Qyvex Edge account.
            </p>
          ),
        },
        {
          title: "Early V1 product",
          body: (
            <p>
              Qyvex Edge is an early V1 product. Features may change, bugs may occur, and users should verify important
              journal, sync, and analytics data before relying on it for review.
            </p>
          ),
        },
        {
          title: "Acceptable use",
          body: (
            <p>
              Do not misuse the app, attempt to access another user's data, upload malicious content, abuse API routes,
              or use Qyvex Edge for unlawful activity.
            </p>
          ),
        },
        {
          title: "Limitation",
          body: (
            <p>
              Qyvex Edge is provided as-is for discipline tracking and journaling. We are not responsible for trading
              losses, broker issues, prop firm outcomes, or decisions made outside the app.
            </p>
          ),
        },
      ]}
    />
  );
}
