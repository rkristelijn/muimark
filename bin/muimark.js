#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const pkgDir = path.dirname(__dirname);
const pkg = require(path.join(pkgDir, "package.json"));

// --- Parse arguments ---
const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

// --- Help ---
if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`
${pkg.name} v${pkg.version}
${pkg.description}

Usage:
  muimark [options]
  muimark [data-dir]

Options:
  --data-dir, -d <path>   Directory with markdown files (default: current dir)
  --config, -c <path>     Path to .muimark.yaml config file (optional)
  --port, -p <number>     Port to listen on (default: 3000)
  --dev                   Run in development mode (hot-reload)
  --help, -h              Show this help message
  --version, -v           Show version number

Examples:
  muimark                           Start in current directory
  muimark ~/git/personal            Start with a specific data directory
  muimark --data-dir ~/git/docs     Same as above, explicit flag
  muimark --port 4000               Start on port 4000
  muimark --config ./my-config.yaml Use a specific config file
  muimark --dev                     Run in dev mode with hot-reload

Config file (.muimark.yaml):
  Place a .muimark.yaml in your data directory for custom settings:

    dataDir: .                # Relative or absolute path to markdown root
    folders:                  # Optional: configure specific folders
      - id: incidents
        label: Incidents
        path: incidents
        icon: warning
        idPattern: "^(I-\\\\d+)"
        fields:
          - name: status
            label: Status
            type: select
            options:
              - { value: Open, color: warning }
              - { value: Closed, color: success }

  Without a config file, muimark auto-discovers all directories
  containing markdown files.

Environment variables:
  MUIMARK_DATA_DIR   Override the data directory
  PORT               Override the port (same as --port)
`);
  process.exit(0);
}

// --- Version ---
if (hasFlag("--version") || hasFlag("-v")) {
  console.log(`${pkg.name} v${pkg.version}`);
  process.exit(0);
}

// --- Resolve data directory ---
let dataDir = getArg("--data-dir") || getArg("-d");

// Positional argument: first arg that doesn't start with --
if (!dataDir) {
  const positional = args.find((a) => !a.startsWith("-") && !args.some((b, i) => (b === "--data-dir" || b === "-d" || b === "--config" || b === "-c" || b === "--port" || b === "-p") && args[i + 1] === a));
  if (positional && fs.existsSync(positional)) {
    dataDir = positional;
  }
}

dataDir = path.resolve(dataDir || ".");

if (!fs.existsSync(dataDir)) {
  console.error(`Error: Data directory not found: ${dataDir}`);
  process.exit(1);
}

// --- Resolve config ---
let configPath = getArg("--config") || getArg("-c");
if (configPath) {
  configPath = path.resolve(configPath);
  if (!fs.existsSync(configPath)) {
    console.error(`Error: Config file not found: ${configPath}`);
    process.exit(1);
  }
}

// --- Port ---
const port = getArg("--port") || getArg("-p") || process.env.PORT || "3000";

// --- Dev mode ---
const isDev = hasFlag("--dev");

// --- Start ---
console.log(`${pkg.name} v${pkg.version}`);
console.log(`Data:   ${dataDir}`);
if (configPath) console.log(`Config: ${configPath}`);
console.log(`Mode:   ${isDev ? "development" : "production"}`);
console.log(`URL:    http://localhost:${port}`);
console.log("");

const env = {
  ...process.env,
  MUIMARK_DATA_DIR: dataDir,
  PORT: String(port),
};

if (configPath) {
  env.MUIMARK_CONFIG = configPath;
}

try {
  if (isDev) {
    execSync(`npx next dev "${pkgDir}" --port ${port}`, {
      stdio: "inherit",
      env,
      cwd: pkgDir,
    });
  } else {
    execSync(`npx next start "${pkgDir}" --port ${port}`, {
      stdio: "inherit",
      env,
      cwd: pkgDir,
    });
  }
} catch {
  process.exit(1);
}
