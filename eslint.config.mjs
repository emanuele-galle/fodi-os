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
  // Downgrade React Compiler rules that flag legitimate patterns (sync state from props, localStorage init, fetch-in-effect)
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  // Disable react-perf/jsx-no-new-object-as-prop in files where inline objects are intentional (framer-motion animations, Recharts props)
  {
    files: [
      "**/components/guide/**",
      "**/components/layout/CommandPalette.tsx",
      "**/components/layout/OnboardingWizard.tsx",
      "**/components/erp/ReportsCharts.tsx",
      "**/components/erp/TemplatePreview.tsx",
      "**/components/erp/MarginChart.tsx",
      "**/components/erp/dashboard/**",
      "**/components/dashboard/**Chart.tsx",
      "**/components/dashboard/FinancialSummaryCard.tsx",
      "**/components/dashboard/PipelineFunnel.tsx",
      "**/components/dashboard/ActivityTrendChart.tsx",
      "**/components/crm/CrmCharts.tsx",
      "**/app/c/[slug]/opengraph-image.tsx",
    ],
    rules: {
      "react-perf/jsx-no-new-object-as-prop": "off",
    },
  },
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
