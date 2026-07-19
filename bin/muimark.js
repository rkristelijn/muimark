#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);

// Find config file
let configPath = path.resolve(".config/itsm.yaml");
const configIdx = args.indexOf("--config");
if (configIdx !== -1 && args[configIdx + 1]) {
  configPath = path.resolve(args[configIdx + 1]);
}

if (!fs.existsSync(configPath)) {
  console.error(`Error: Config file not found: ${configPath}`);
  console.error("");
  console.error("Usage: muimark [--config ./path/to/config.yaml]");
  console.error("");
  console.error("Default: looks for .config/itsm.yaml in the current directory");
  process.exit(1);
}

// Set environment variable for the config path
process.env.MUIMARK_CONFIG = configPath;

const pkgDir = path.dirname(__dirname);
const port = process.env.PORT || 3000;

console.log(`muimark v${require(path.join(pkgDir, "package.json")).version}`);
console.log(`Config: ${configPath}`);
console.log(`Starting on http://localhost:${port}`);
console.log("");

try {
  execSync(`npx next start "${pkgDir}" --port ${port}`, {
    stdio: "inherit",
    env: { ...process.env, MUIMARK_CONFIG: configPath },
  });
} catch {
  process.exit(1);
}
