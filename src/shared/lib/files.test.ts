import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { clearConfigCache } from "./config";

// Create a temporary data directory with test fixtures
let tmpDir: string;
let origEnv: string | undefined;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "muimark-test-"));

  // Create incidents folder with test files
  const incidentsDir = path.join(tmpDir, "incidents");
  fs.mkdirSync(incidentsDir, { recursive: true });

  fs.writeFileSync(
    path.join(incidentsDir, "I-012.md"),
    `---
status: Resolved
severity: High
date: 2025-03-15
---

# I-012: Server outage on pepper

The server went down due to disk full.
`
  );

  fs.writeFileSync(
    path.join(incidentsDir, "I-013.md"),
    `# I-013: Network timeout

**Status:** Investigating
**Severity:** Medium

Network timeouts observed on jarvis.
`
  );

  // Create changes folder
  const changesDir = path.join(tmpDir, "changes");
  fs.mkdirSync(changesDir, { recursive: true });

  fs.writeFileSync(
    path.join(changesDir, "SC-001.md"),
    `---
status: Closed
priority: Medium
created: 2025-01-10
---

# SC-001: Upgrade NUT driver

Upgrade riello_ser driver to latest version.
`
  );

  // Create empty problems folder
  const problemsDir = path.join(tmpDir, "problems");
  fs.mkdirSync(problemsDir, { recursive: true });

  // Write a .muimark.yaml config
  fs.writeFileSync(
    path.join(tmpDir, ".muimark.yaml"),
    `dataDir: ${tmpDir}
folders:
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
          - { value: Investigating, color: warning }
          - { value: Resolved, color: success }
      - name: severity
        label: Severity
        type: select
        options:
          - { value: High, color: error }
          - { value: Medium, color: warning }
      - name: date
        label: Date
        type: date
  - id: changes
    label: Changes
    path: changes
    icon: build
    idPattern: "^(SC-\\\\d+)"
    fields:
      - name: status
        label: Status
        type: select
        options:
          - { value: Planned, color: info }
          - { value: Closed, color: success }
      - name: priority
        label: Priority
        type: select
        options:
          - { value: Medium, color: info }
      - name: created
        label: Created
        type: date
  - id: problems
    label: Problems
    path: problems
    icon: bug_report
    fields: []
`
  );

  // Set env to point config at our temp dir
  origEnv = process.env.MUIMARK_DATA_DIR;
  process.env.MUIMARK_DATA_DIR = tmpDir;
  clearConfigCache();
});

afterAll(() => {
  // Restore env
  if (origEnv !== undefined) {
    process.env.MUIMARK_DATA_DIR = origEnv;
  } else {
    delete process.env.MUIMARK_DATA_DIR;
  }
  clearConfigCache();

  // Clean up temp dir
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Dynamic imports after env is set — we need to re-import after clearConfigCache
async function getModules() {
  // Force fresh module evaluation
  const files = await import("./files");
  return files;
}

describe("files", () => {
  describe("listFolders", () => {
    it("should return all configured folders", async () => {
      const { listFolders } = await getModules();
      const folders = listFolders();
      expect(folders).toBeInstanceOf(Array);
      expect(folders.length).toBeGreaterThan(0);

      const ids = folders.map((f) => f.id);
      expect(ids).toContain("incidents");
      expect(ids).toContain("changes");
    });
  });

  describe("listFiles", () => {
    it("should list incident files", async () => {
      const { listFiles } = await getModules();
      const files = listFiles("incidents");
      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should parse frontmatter/inline metadata", async () => {
      const { listFiles } = await getModules();
      const files = listFiles("incidents");
      const file = files.find((f) => f.id === "I-012");
      expect(file).toBeDefined();
      expect(file?.title).toBeDefined();
      expect(file?.frontmatter).toBeDefined();
      expect(file?.frontmatter.status).toBe("Resolved");
    });

    it("should throw for unknown folder", async () => {
      const { listFiles } = await getModules();
      expect(() => listFiles("nonexistent")).toThrow("Unknown folder");
    });

    it("should return empty array for empty folder", async () => {
      const { listFiles } = await getModules();
      const files = listFiles("problems");
      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBe(0);
    });
  });

  describe("getFile", () => {
    it("should return file with content", async () => {
      const { getFile } = await getModules();
      const file = getFile("incidents", "I-012");
      expect(file).toBeDefined();
      expect(file?.content).toBeDefined();
      expect(file?.content.length).toBeGreaterThan(0);
      expect(file?.frontmatter).toBeDefined();
    });

    it("should return null for nonexistent file", async () => {
      const { getFile } = await getModules();
      const file = getFile("incidents", "I-999");
      expect(file).toBeNull();
    });

    it("should return null for unknown folder", async () => {
      const { getFile } = await getModules();
      const file = getFile("nonexistent", "test");
      expect(file).toBeNull();
    });

    it("should strip ID prefix from title", async () => {
      const { getFile } = await getModules();
      const file = getFile("incidents", "I-012");
      expect(file?.title).not.toMatch(/^I-012:/);
      expect(file?.title).toContain("Server outage");
    });

    it("should reject path traversal in fileId", async () => {
      const { getFile } = await getModules();
      expect(() => getFile("incidents", "../../../etc/passwd")).toThrow(
        "Invalid filename"
      );
    });
  });
});
