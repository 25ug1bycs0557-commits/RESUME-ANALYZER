"use strict";

const assert = require("node:assert/strict");
const { readFileSync, statSync } = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.resolve(__dirname, "../..");
const appSource = readFileSync(path.join(root, "app.js"), "utf8");
const libraryPath = path.join(root, "vendor", "pdfjs-dist-4.4.168", "build", "pdf.min.mjs");
const workerPath = path.join(root, "vendor", "pdfjs-dist-4.4.168", "build", "pdf.worker.min.mjs");

describe("PDF.js supply-chain protection", function () {
  it("loads the PDF parser and worker from the bundled local release", function () {
    assert.ok(statSync(libraryPath).size > 0, "the bundled PDF.js module must be present");
    assert.ok(statSync(workerPath).size > 0, "the bundled PDF.js worker must be present");
    assert.match(appSource, /import\("\.\/vendor\/pdfjs-dist-4\.4\.168\/build\/pdf\.min\.mjs"\)/);
    assert.match(appSource, /workerSrc\s*=\s*new URL\("\.\/vendor\/pdfjs-dist-4\.4\.168\/build\/pdf\.worker\.min\.mjs",\s*document\.baseURI\)\.href/);
    assert.doesNotMatch(appSource, /https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist/);
  });
});
