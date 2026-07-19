import { describe, it, expect } from "vitest";
import { getConfig, getFolderDef, getAbsolutePath } from "./config";

describe("config", () => {
  describe("getConfig", () => {
    it("should load config from itsm.config.yaml", () => {
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

    it("should reject absolute paths", () => {
      expect(() => getAbsolutePath("/etc/passwd")).toThrow(
        "Path traversal detected"
      );
    });
  });
});
