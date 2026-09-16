// Native ESM: src/ is "type": "module" and is never transpiled, so the babel coverage
// provider reports nothing for it. v8 reads coverage from the real module the tests run.
// Requires --experimental-vm-modules, set in package.json's test script.
export default {
  testEnvironment: "node",
  coverageProvider: "v8",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.js"],
  // The threshold lives here, not in a CI step, so a step deleted from the workflow
  // cannot silently disable it.
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
};
