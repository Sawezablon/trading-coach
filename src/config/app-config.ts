import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "TradeGuardian AI",
  version: packageJson.version,
  copyright: `© ${currentYear}, TradeGuardian AI.`,
  meta: {
    title: "TradeGuardian AI",
    description: "AI trading journal and discipline coach for rule-based traders.",
  },
};
