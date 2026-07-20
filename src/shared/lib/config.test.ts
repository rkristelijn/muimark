import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getConfig, getFolderDef, getAbsolutePath, clearConfigCache } from "./config";

let tmpDir: string;
let origEnv: string | undefined;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "muimark-config-test-"));

  // Create a directory structure
  fs.mkdirSync(path.join(tmpDir, "incidents"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "incidents", "I-001.md"), "# Test\n");
  fs.mkdirSync(path.join(tmpDir, "changes"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "changes", "SC-001.md"), "# Change\n");

  // Write config
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
          - { value: Open, color: warning }
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
`
  );

  origEnv = process.env.MUIMARK_DATA_DIR;
  process.env.MUIMARK_DATA_DIR = tmpDir;
  clearConfigCache();
});

afterAll(() => {
  if (origEnv !== undefined) {
    process.env.MUIMARK_DATA_DIR = origEnv;
  } else {
    delete process.env.MUIMARK_DATA_DIR;
  }
  clearConfigCache();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("config", () => {
  describe("getConfig", () => {
    it("should load config", () => {
      const config = getConfig();
      expect(config).toBeDefined();
      expect(config.dataDir).toBeDefined();
      expect(config.folders).toBeInstanceOf(Array);
      expect(config.folders.length).toBeGreaterThan(0);
    });

    it("should have valid folder definitions", () => {
      const config = getConfig();
      for (const folder of config.folders) {
        expect(folder.id).toBeDefined();
        expect(folder.label).toBeDefined();
        expect(folder.path).toBeDefined();
        expect(folder.icon).toBeDefined();
        expect(folder.fields).toBeInstanceOf(Array);
      }
    });

    it("should have a tree property", () => {
      const config = getConfig();
      expect(config.tree).toBeInstanceOf(Array);
      expect(config.tree.length).toBeGreaterThan(0);
    });
  });

  describe("getFolderDef", () => {
    it("should return folder definition by id", () => {
      const folder = getFolderDef("incidents");
      expect(folder).toBeDefined();
      expect(folder?.label).toBe("Incidents");
    });

    it("should return undefined for unknown folder", () => {
      const folder = getFolderDef("nonexistent");
      expect(folder).toBeUndefined();
    });
  });

  describe("getAbsolutePath", () => {
    it("should resolve relative path within dataDir", () => {
      const result = getAbsolutePath("incidents");
      expect(result).toContain("incidents");
      expect(result).not.toContain("..");
    });

    it("should reject path traversal attempts", () => {
      expect(() => getAbsolutePath("../../etc/passwd")).toThrow(
        "Path traversal detected"
      );
    });

    it("should reject absolute paths outside dataDir", () => {
      expect(() => getAbsolutePath("/etc/passwd")).toThrow(
        "Path traversal detected"
      );
    });
  });
});
