import type { OxfmtConfig } from "oxc-config-hope/oxfmt";
import { defineHopeConfig } from "oxc-config-hope/oxfmt";

const config: OxfmtConfig = defineHopeConfig({
  ignorePatterns: ["demo/**/*.js"],
});

export default config;
