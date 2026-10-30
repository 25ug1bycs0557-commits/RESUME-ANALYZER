"use strict";

const assert = require("node:assert/strict");
const { describe, it, before, after } = require("node:test");

const { app } = require("../../server");

describe("Careerly API", function () {
  const server = app.listen(0);
  const baseUrl = "http://127.0.0.1:" + server.address().port;

  after(function (done) {
    server.close(done);
  });

  it("exposes a health endpoint", async function () {
    const response = await fetch(baseUrl + "/health");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, "ok");
  });

  it("analyzes valid resume text", async function () {
    const response = await fetch(baseUrl + "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: "Alex Example\nSummary: A software engineering student focused on building useful tools.\nEducation: Bachelor of Technology in Computer Science.\nExperience: Software Engineer Intern working with JavaScript and Python.\nProjects\n- Built a React dashboard with SQL-backed reporting.\n- Improved Git-based delivery workflows by 20%.\nSkills: JavaScript, Python, React, SQL, Git" })
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(typeof payload.analysis.score, "number");
    assert.ok(Array.isArray(payload.analysis.skills));
  });

  it("rejects resumes below the minimum length", async function () {
    const response = await fetch(baseUrl + "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: "short" })
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.match(payload.error, /at least 60 characters/);
  });
});
