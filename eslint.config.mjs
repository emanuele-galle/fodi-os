import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules } from "@eslint/compat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import reactPerf from "eslint-plugin-react-perf";
import createGuardrails from "/home/sviluppatore/configs/eslint-guardrails.mjs";

const guardrails = createGuardrails(sonarjs, reactPerf);

const eslintConfig = defineConfig([
  ...fixupConfigRules(nextVitals),
  ...fixupConfigRules(nextTs),
  ...guardrails,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "remotion/**",
    "audit/**",
    "mcp-server/dist/**",
  ]),
]);

export default eslintConfig;
