/**
 * @vitest-environment node
 * @covers F-032 Image serving
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { clearConfigCache } from "@/shared/lib/config";
import { GET } from "./route";
import { NextRequest } from "next/server";

let tmpDir: string;
let origEnv: string | undefined;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "muimark-images-serve-test-"));

  // Create folder structure with config and test images
  const incidentsDir = path.join(tmpDir, "incidents");
  fs.mkdirSync(incidentsDir, { recursive: true });

  // 1x1 transparent PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "base64"
  );
  fs.writeFileSync(path.join(incidentsDir, "I-012-keyboard-fix.md"), "# Test\n");
  fs.writeFileSync(path.join(incidentsDir, "I-012-keyboard-fix.screenshot-ab12.png"), png);
  fs.writeFileSync(path.join(incidentsDir, "I-012-keyboard-fix.photo-cd34.jpg"), Buffer.alloc(50, 0xff));
  fs.writeFileSync(
    path.join(incidentsDir, "I-012-keyboard-fix.icon-ef56.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
  );

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

function createGetRequest(segments: string[]): [NextRequest, { params: Promise<{ path: string[] }> }] {
  const url = `http://localhost:3000/api/images/${segments.join("/")}`;
  const request = new NextRequest(url, { method: "GET" });
  const context = { params: Promise.resolve({ path: segments }) };
  return [request, context];
}

describe("GET /api/images/[...path]", () => {
  it("serves a PNG image with correct content type", async () => {
    const [request, context] = createGetRequest(["incidents", "I-012-keyboard-fix.screenshot-ab12.png"]);
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("max-age=86400");

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("serves a JPEG image with correct content type", async () => {
    const [request, context] = createGetRequest(["incidents", "I-012-keyboard-fix.photo-cd34.jpg"]);
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("serves an SVG image with correct content type", async () => {
    const [request, context] = createGetRequest(["incidents", "I-012-keyboard-fix.icon-ef56.svg"]);
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");

    const text = await response.text();
    expect(text).toContain("<svg");
  });

  it("returns 404 for non-existent files", async () => {
    const [request, context] = createGetRequest(["incidents", "nonexistent.png"]);
    const response = await GET(request, context);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Not found");
  });

  it("returns 404 for unknown folder", async () => {
    const [request, context] = createGetRequest(["nonexistent-folder", "test.png"]);
    const response = await GET(request, context);

    expect(response.status).toBe(404);
  });

  it("blocks directory traversal attempts", async () => {
    const [request, context] = createGetRequest(["incidents", "..", ".muimark.yaml"]);
    const response = await GET(request, context);

    // Should be either 403 (traversal) or 403 (not an image)
    expect(response.status).toBe(403);
  });

  it("rejects non-image file extensions", async () => {
    // Even if a .md file exists, it should be rejected
    const [request, context] = createGetRequest(["incidents", "I-012-keyboard-fix.md"]);
    const response = await GET(request, context);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Not an image");
  });

  it("returns 400 for path with only one segment", async () => {
    const [request, context] = createGetRequest(["onlyone"]);
    const response = await GET(request, context);

    expect(response.status).toBe(400);
  });

  it("returns immutable cache header", async () => {
    const [request, context] = createGetRequest(["incidents", "I-012-keyboard-fix.screenshot-ab12.png"]);
    const response = await GET(request, context);

    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });
});
