import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  target: "node",
  mode: "production",
  entry: "./src/index.js",
  output: {
    path: resolve(__dirname, "dist"),
    filename: "index.js",
    module: true,
    chunkFormat: "module",
    library: { type: "module" }
  },
  experiments: {
    outputModule: true,
    topLevelAwait: true
  }
};