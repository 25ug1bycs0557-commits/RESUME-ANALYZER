"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

global.window = globalThis;
require("../../analyzer.js");

const { analyze } = globalThis.ResumeAnalyzer;

const resumeText = [
  "Alex Example",
  "alex@example.com",
  "Summary: A software engineering student focused on building useful tools.",
  "Education: Bachelor of Technology in Computer Science.",
  "Experience: Software Engineer Intern working with JavaScript and Python.",
  "Projects",
  "- Built a React dashboard with SQL-backed reporting.",
  "- Improved Git-based delivery workflows by 20%.",
  "Skills: JavaScript, Python, React, SQL, Git"
].join("\n");

describe("ResumeAnalyzer.analyze", function () {
  it("accepts resume text and returns the documented analysis structure", function () {
    const result = analyze(resumeText);

    assert.equal(typeof result.createdAt, "string");
    assert.ok(Number.isInteger(result.wordCount));
    assert.equal(typeof result.summary, "string");
    assert.ok(Array.isArray(result.facts.education));
    assert.ok(Array.isArray(result.facts.experience));
    assert.ok(Array.isArray(result.facts.projects));
    assert.ok(Array.isArray(result.facts.achievements));
    assert.equal(typeof result.categories, "object");
    assert.ok(Array.isArray(result.skills));
    assert.equal(typeof result.sections, "object");
    Object.values(result.sections).forEach(function (value) { assert.equal(typeof value, "boolean"); });
    assert.ok(Number.isInteger(result.score));
    assert.equal(typeof result.scoreParts, "object");
    Object.values(result.scoreParts).forEach(function (value) { assert.ok(Number.isInteger(value)); });
    assert.ok(Array.isArray(result.roles));
    assert.ok(Array.isArray(result.improvements));
    assert.equal(typeof result.suggestedDirection, "string");
    assert.equal(result.method, "Local heuristic analysis");
  });

  it("rejects empty, whitespace-only, and insufficient text with the minimum-length guidance", function () {
    for (const input of ["", " \t\r\n ", "Short resume text"]) {
      assert.throws(
        function () { analyze(input); },
        /at least 60 characters/
      );
    }
  });

  it("accepts exactly 60 non-whitespace characters and rejects 59", function () {
    assert.equal(analyze("x".repeat(60)).wordCount, 1);
    assert.throws(function () { analyze("x".repeat(59)); }, /at least 60 characters/);
  });

  it("handles absent and non-string values through its existing string coercion contract", function () {
    for (const input of [null, undefined, 42, {}]) {
      assert.throws(function () { analyze(input); }, /at least 60 characters/);
    }
  });

  it("detects skills under their existing category and normalizes duplicates", function () {
    const result = analyze(resumeText + "\nJavaScript, python, REACT, SQL, git");

    assert.deepEqual(result.categories["Programming languages"], ["javascript", "python", "sql"]);
    assert.deepEqual(result.categories["Frameworks & libraries"], ["react"]);
    assert.deepEqual(result.categories.Databases, []);
    assert.deepEqual(result.categories["Tools & platforms"], ["git"]);
    assert.equal(result.skills.filter(function (skill) { return skill === "javascript"; }).length, 1);
  });

  it("does not detect skills embedded within unrelated words", function () {
    const result = analyze(
      "A candidate describes javascripted ideas and a pythonista hobby, but lists no specific technical tools."
    );

    assert.deepEqual(result.skills, []);
  });

  it("keeps the score equal to its checklist parts and within the checklist's 100-point maximum", function () {
    const result = analyze(resumeText);
    const maximums = {
      "Key sections": 30,
      "Relevant skills": 25,
      "Project & experience detail": 20,
      "Achievement evidence": 15,
      "Readability & structure": 10
    };

    assert.equal(result.score, Object.values(result.scoreParts).reduce(function (sum, part) { return sum + part; }, 0));
    assert.deepEqual(Object.keys(result.scoreParts), Object.keys(maximums));
    Object.keys(maximums).forEach(function (part) {
      assert.ok(result.scoreParts[part] >= 0 && result.scoreParts[part] <= maximums[part]);
    });
  });

  it("returns role recommendations using the configured role fields and match calculation", function () {
    const result = analyze(resumeText);

    assert.ok(result.roles.length > 0 && result.roles.length <= 4);
    result.roles.forEach(function (role) {
      assert.equal(typeof role.title, "string");
      assert.ok(Array.isArray(role.skills));
      assert.ok(Array.isArray(role.matched));
      assert.ok(Array.isArray(role.missing));
      assert.ok(role.match >= 0 && role.match <= 100);
      assert.equal(role.match, Math.round(role.matched.length / role.skills.length * 100));
      assert.ok(role.missing.every(function (skill) { return !role.matched.includes(skill); }));
    });
  });

  it("bases suggestions on detected content and does not invent credentials or work history", function () {
    const result = analyze("A learner enjoys solving puzzles and reading about technology outside class.");

    assert.ok(result.improvements.length > 0);
    assert.match(result.summary, /No clear work or internship entry was detected/);
    assert.doesNotMatch(result.summary, /certified|award-winning|managed a team/i);
  });
});
