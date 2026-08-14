/**
 * @vitest-environment node
 * @covers F-030 Image paste
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { clearConfigCache } from "@/shared/lib/config";
import { POST } from "./route";

let tmpDir: string;
let origEnv: string | undefined;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "muimark-images-test-"));

  // Create folder structure with config
  const incidentsDir = path.join(tmpDir, "incidents");
  fs.mkdirSync(incidentsDir, { recursive: true });
  fs.writeFileSync(path.join(incidentsDir, "I-012-keyboard-fix.md"), "# Test\n");

  fs.writeFileSync(
    path.join(tmpDir, ".muimark.yaml"),
    `dataDir: ${tmpDir}\nfolders:\n  - id: incidents\n    label: Incidents\n    path: incidents\n`
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

/**
 * Build a proper Request with FormData including folderId and fileId.
 */
function createUploadRequest(
  filename: string,
  mimeType: string,
  content: Buffer,
  folderId = "incidents",
  fileId = "I-012-keyboard-fix"
): Request {
  const file = new File([content], filename, { type: mimeType });
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folderId", folderId);
  formData.append("fileId", fileId);

  return new Request("http://localhost:3000/api/images/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/images/upload", () => {
  it("uploads a PNG image alongside the markdown file", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64"
    );

    const request = createUploadRequest("screenshot.png", "image/png", png);
    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    // URL format: /api/images/<folderId>/<fileId>.<name>-<4char>.<ext>
    expect(data.url).toMatch(
      /^\/api\/images\/incidents\/I-012-keyboard-fix\.screenshot-[a-f0-9]{4}\.png$/
    );

    // Verify file exists in the folder alongside the markdown file
    const imageFilename = data.url.replace("/api/images/incidents/", "");
    const filePath = path.join(tmpDir, "incidents", imageFilename);
    expect(fs.existsSync(filePath)).toBe(true);

    // Verify content matches
    const saved = fs.readFileSync(filePath);
    expect(saved.equals(png)).toBe(true);
  });

  it("sanitizes filenames with special characters", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64"
    );

    const request = createUploadRequest("my screenshot (2).png", "image/png", png);
    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toMatch(
      /^\/api\/images\/incidents\/I-012-keyboard-fix\.my_screenshot__2_-[a-f0-9]{4}\.png$/
    );
  });

  it("rejects missing file", async () => {
    const formData = new FormData();
    formData.append("folderId", "incidents");
    formData.append("fileId", "I-012-keyboard-fix");

    const request = new Request("http://localhost:3000/api/images/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No file provided");
  });

  it("rejects missing folderId/fileId", async () => {
    const file = new File([Buffer.alloc(10)], "test.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("image", file);

    const request = new Request("http://localhost:3000/api/images/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("folderId and fileId are required");
  });

  it("rejects invalid file types", async () => {
    const request = createUploadRequest("script.js", "application/javascript", Buffer.from("alert(1)"));
    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid file type");
  });

  it("rejects unknown folder", async () => {
    const png = Buffer.alloc(10, 0x89);
    const request = createUploadRequest("test.png", "image/png", png, "nonexistent", "file");
    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Folder not found");
  });

  it("accepts JPEG images", async () => {
    const jpeg = Buffer.alloc(100, 0xff);
    const request = createUploadRequest("photo.jpg", "image/jpeg", jpeg);
    const response = await POST(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toMatch(/\.jpg$/);
  });

  it("accepts WebP images", async () => {
    const webp = Buffer.alloc(50, 0x00);
    const request = createUploadRequest("image.webp", "image/webp", webp);
    const response = await POST(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toMatch(/\.webp$/);
  });

  it("accepts SVG images", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
    const request = createUploadRequest("icon.svg", "image/svg+xml", svg);
    const response = await POST(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toMatch(/\.svg$/);
  });

  it("generates unique filenames for duplicate uploads", async () => {
    const png = Buffer.alloc(10, 0x89);

    const req1 = createUploadRequest("dupe.png", "image/png", png);
    const res1 = await POST(req1 as never);
    const data1 = await res1.json();

    const req2 = createUploadRequest("dupe.png", "image/png", png);
    const res2 = await POST(req2 as never);
    const data2 = await res2.json();

    expect(data1.url).not.toBe(data2.url);
  });
});
