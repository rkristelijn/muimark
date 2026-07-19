import { describe, it, expect } from "vitest";
import { listFiles, getFile, listFolders } from "./files";

describe("files", () => {
  describe("listFolders", () => {
    it("should return all configured folders", () => {
      const folders = listFolders();
      expect(folders).toBeInstanceOf(Array);
      expect(folders.length).toBeGreaterThan(0);

      const ids = folders.map((f) => f.id);
      expect(ids).toContain("incidents");
      expect(ids).toContain("changes");
    });
  });

  describe("listFiles", () => {
    it("should list incident files", () => {
      const files = listFiles("incidents");
      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should parse frontmatter/inline metadata", () => {
      const files = listFiles("incidents");
      const file = files.find((f) => f.id === "I-012");
      expect(file).toBeDefined();
      expect(file?.title).toBeDefined();
      expect(file?.frontmatter).toBeDefined();
    });

    it("should throw for unknown folder", () => {
      expect(() => listFiles("nonexistent")).toThrow("Unknown folder");
    });

    it("should return empty array for empty folder", () => {
      // problems folder might not exist or be empty
      const files = listFiles("problems");
      expect(files).toBeInstanceOf(Array);
    });
  });

  describe("getFile", () => {
    it("should return file with content", () => {
      const file = getFile("incidents", "I-012");
      expect(file).toBeDefined();
      expect(file?.content).toBeDefined();
      expect(file?.content.length).toBeGreaterThan(0);
      expect(file?.frontmatter).toBeDefined();
    });

    it("should return null for nonexistent file", () => {
      const file = getFile("incidents", "I-999");
      expect(file).toBeNull();
    });

    it("should return null for unknown folder", () => {
      const file = getFile("nonexistent", "test");
      expect(file).toBeNull();
    });

    it("should strip ID prefix from title", () => {
      const file = getFile("incidents", "I-012");
      expect(file?.title).not.toMatch(/^I-012:/);
    });

    it("should reject path traversal in fileId", () => {
      expect(() => getFile("incidents", "../../../etc/passwd")).toThrow(
        "Invalid filename"
      );
    });
  });
});
