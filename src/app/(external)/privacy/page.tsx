import type { Metadata } from "next";

import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Qyvex Edge",
  description: "How Qyvex Edge handles account, journal, feedback, and MT5 sync data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      sections={[
        {
          title: "What we collect",
          body: (
            <p>
              Qyvex Edge stores account details, authentication records through Supabase Auth, journaled trades, trading
              rules, MT5 sync metadata, uploaded chart screenshots, feedback reports, and product usage context needed
              to operate the app.
            </p>
          ),
        },
        {
          title: "How we use data",
          body: (
            <p>
              We use your data to run the journal, calculate discipline analytics, detect rule violations, sync
              read-only MT5 trade history, improve product reliability, and provide AI analysis when an OpenAI API key
              is configured.
            </p>
          ),
        },
        {
          title: "What we do not do",
          body: (
            <p>
              Qyvex Edge does not place trades, close trades, modify broker positions, sell trading signals, or provide
              copy-trading services. MT5 sync is designed as read-only trade history import.
            </p>
          ),
        },
        {
          title: "Third-party services",
          body: (
            <p>
              The app uses Supabase for authentication, database, and storage, Vercel for hosting, OpenAI for optional
              trade analysis, and PayPal for optional support donations.
            </p>
          ),
        },
        {
          title: "Contact",
          body: (
            <p>For privacy questions, contact Qyvex through the in-app feedback form or the official Qyvex channels.</p>
          ),
        },
      ]}
    />
  );
}
