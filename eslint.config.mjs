import globals from "globals";

// Rules are errors, not warnings. The PR agent merges with no human review and gates on
// the release workflow, so a warning is indistinguishable from a pass and never blocks.
const rules = {
  "no-const-assign": "error",
  "no-this-before-super": "error",
  "no-undef": "error",
  "no-unreachable": "error",
  "no-unused-vars": "error",
  "constructor-super": "error",
  "valid-typeof": "error"
};

export default [
  {
    ignores: ["dist/**", "release/**", "coverage/**", "node_modules/**"]
  },
  {
    files: ["src/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules
  }
];
