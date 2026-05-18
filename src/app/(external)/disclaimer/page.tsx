import type { Metadata } from "next";

import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Disclaimer | Qyvex Edge",
  description: "Trading and financial disclaimer for Qyvex Edge.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      eyebrow="Disclaimer"
      title="Trading Disclaimer"
      sections={[
        {
          title: "Not financial advice",
          body: (
            <p>
              Qyvex Edge is not financial, investment, tax, or legal advice. The app is built to help traders review
              their own decisions and rules, not to tell anyone what to buy, sell, hold, or avoid.
            </p>
          ),
        },
        {
          title: "No signals or predictions",
          body: (
            <p>
              Qyvex Edge does not provide trading signals, market predictions, guaranteed outcomes, copy trading, or
              automated broker execution.
            </p>
          ),
        },
        {
          title: "Trading risk",
          body: (
            <p>
              Trading involves risk and can result in significant financial loss. Past results, journal analytics, AI
              observations, and discipline scores do not guarantee future performance.
            </p>
          ),
        },
        {
          title: "AI limitations",
          body: (
            <p>
              AI feedback may be incomplete or wrong. Deterministic rule checks and AI analysis should be treated as
              review support, not as a substitute for your judgment.
            </p>
          ),
        },
        {
          title: "User responsibility",
          body: (
            <p>
              You remain fully responsible for your trades, risk management, broker connections, prop firm compliance,
              and any decisions made before or after using Qyvex Edge.
            </p>
          ),
        },
      ]}
    />
  );
}
