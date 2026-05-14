import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  parentBrand: "Qyvex",
  name: "Qyvex Edge",
  version: packageJson.version,
  copyright: `(c) ${currentYear}, Qyvex.`,
  meta: {
    title: "Qyvex Edge | AI Trading Discipline Assistant",
    description:
      "Qyvex Edge is an AI trading journal and discipline assistant that helps rule-based traders review execution without signals or predictions.",
  },
};
