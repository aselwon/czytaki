import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // These effects synchronize browser-only state (font metrics, localStorage,
    // object URLs, and speech synthesis) after hydration; moving updates into
    // render would change their timing or make server rendering unsafe.
    files: ["app/bubble-copy.tsx", "app/experience.tsx", "app/studio.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // The model-context callbacks need the newest state without re-registering
    // browser tools on every render; the ref is intentionally refreshed here.
    files: ["app/experience.tsx"],
    rules: { "react-hooks/refs": "off" },
  },
]);

export default eslintConfig;
