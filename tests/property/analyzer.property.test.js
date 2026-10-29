"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fc = require("fast-check");

global.window = globalThis;
require("../../analyzer.js");

const { analyze } = globalThis.ResumeAnalyzer;
const propertyOptions = { numRuns: 150, seed: 20261029 };
const minimumLengthText = "Generated resume content is long enough to pass the analyzer's text validation.";
const validResumeText = fc.string({ maxLength: 1200 }).map(function (text) {
  return minimumLengthText + "\n" + text;
});

function withoutTimestamp(result) {
  const copy = Object.assign({}, result);
  delete copy.createdAt;
  return copy;
}

describe("ResumeAnalyzer generated properties", function () {
  it("keeps scores within the documented 0-100 range for generated valid text", function () {
    fc.assert(
      fc.property(validResumeText, function (text) {
        const result = analyze(text);
        assert.ok(result.score >= 0 && result.score <= 100);
      }),
      propertyOptions
    );
  });

  it("produces equivalent analysis for identical input apart from its timestamp", function () {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }).map(function (text) { return minimumLengthText + "\n" + text; }), function (text) {
        assert.deepEqual(withoutTimestamp(analyze(text)), withoutTimestamp(analyze(text)));
      }),
      propertyOptions
    );
  });

  it("detects known skills regardless of generated letter casing", function () {
    const skills = ["javascript", "typescript", "python", "react", "node.js", "git", "problem solving"];

    fc.assert(
      fc.property(
        fc.constantFrom.apply(null, skills),
        fc.constantFrom("upper", "lower", "alternating"),
        function (skill, casing) {
          const variation = Array.from(skill).map(function (character, index) {
            const uppercase = casing === "upper" || (casing === "alternating" && index % 2 === 0);
            return uppercase ? character.toUpperCase() : character.toLowerCase();
          }).join("");
          const result = analyze(minimumLengthText + "\n" + variation);
          assert.ok(result.skills.includes(skill));
        }
      ),
      propertyOptions
    );
  });

  it("does not add duplicate entries when a known skill is repeated", function () {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), function (repetitions) {
        const result = analyze(minimumLengthText + "\n" + Array(repetitions).fill("JavaScript").join(", "));
        assert.equal(result.skills.filter(function (skill) { return skill === "javascript"; }).length, 1);
      }),
      propertyOptions
    );
  });

  it("rejects all generated inputs shorter than the analyzer's minimum", function () {
    fc.assert(
      fc.property(fc.string({ maxLength: 59 }), function (text) {
        assert.throws(function () { analyze(text); }, /at least 60 characters/);
      }),
      propertyOptions
    );
  });

  it("returns a valid result structure for generated punctuation, Unicode, and whitespace", function () {
    fc.assert(
      fc.property(fc.string({ maxLength: 800 }).map(function (text) { return minimumLengthText + "\n" + text; }), function (text) {
        const result = analyze(text);
        assert.ok(result && typeof result === "object");
        assert.ok(Number.isInteger(result.score));
        assert.ok(result.categories && typeof result.categories === "object");
        assert.ok(Array.isArray(result.skills));
        assert.ok(Array.isArray(result.roles));
        assert.ok(Array.isArray(result.improvements));
      }),
      propertyOptions
    );
  });

  it("does not list a matched role skill as missing", function () {
    fc.assert(
      fc.property(fc.string({ maxLength: 800 }).map(function (text) { return minimumLengthText + "\n" + text; }), function (text) {
        const result = analyze(text);
        result.roles.forEach(function (role) {
          role.missing.forEach(function (skill) {
            assert.ok(!role.matched.includes(skill));
          });
        });
      }),
      propertyOptions
    );
  });
});
