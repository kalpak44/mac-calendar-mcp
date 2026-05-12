import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");
const releaseDir = resolve(root, "release");
const bundleDir = resolve(releaseDir, "mac-calendar-mcp");
const zipPath = resolve(releaseDir, "mac-calendar-mcp.zip");

function ensureFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Required file not found: ${path}`);
  }
}

rmSync(distDir, { recursive: true, force: true });
rmSync(releaseDir, { recursive: true, force: true });

execFileSync(
  process.execPath,
  [resolve(root, "node_modules/webpack/bin/webpack.js")],
  { cwd: root, stdio: "inherit" }
);

mkdirSync(bundleDir, { recursive: true });

ensureFile(resolve(distDir, "index.js"));
ensureFile(resolve(root, "scripts/calendar-query.swift"));
ensureFile(resolve(root, "README.md"));

cpSync(resolve(distDir, "index.js"), resolve(bundleDir, "index.js"));
cpSync(resolve(root, "scripts/calendar-query.swift"), resolve(bundleDir, "calendar-query.swift"));
cpSync(resolve(root, "README.md"), resolve(bundleDir, "README.md"));

execFileSync(
  "zip",
  ["-r", zipPath, "mac-calendar-mcp"],
  { cwd: releaseDir, stdio: "inherit" }
);
