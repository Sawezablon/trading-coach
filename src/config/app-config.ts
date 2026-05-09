import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Qyvex Lab",
  version: packageJson.version,
  copyright: `© ${currentYear}, Qyvex Lab.`,
  meta: {
    title: "Qyvex Lab",
    description: "Qyvex Lab",
  },
};
