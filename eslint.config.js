import pluginVue from "eslint-plugin-vue";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";

export default defineConfigWithVueTs(
  {
    ignores: ["dist/**", "node_modules/**", ".vite/**"]
  },
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-explicit-any": "error"
    }
  }
);
