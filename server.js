"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const allowedOriginList = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000")
  .split(",")
  .map(function (origin) { return origin.trim(); })
  .filter(Boolean);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

const analysisHistory = [];

function normalizeErrorMessage(error) {
  if (!error || !error.message) return "The request could not be processed.";
  return error.message;
}

function parseOrigin(origin) {
  return origin ? origin.replace(/\/$/, "") : "";
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const parsed = parseOrigin(origin);
  return allowedOriginList.includes(parsed) || allowedOriginList.includes(origin.replace(/https?:\/\//, ""));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS policy."));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.disable("x-powered-by");

const port = Number(process.env.PORT || 3000);

function loadAnalyzer() {
  if (globalThis.ResumeAnalyzer && typeof globalThis.ResumeAnalyzer.analyze === "function") {
    return globalThis.ResumeAnalyzer;
  }

  global.window = globalThis;
  require("./analyzer.js");
  return globalThis.ResumeAnalyzer;
}

function analyzeResumeText(text) {
  const analyzer = loadAnalyzer();
  const sourceText = typeof text === "string" ? text : String(text || "");
  if (!sourceText.trim()) {
    throw new Error("Resume text is required.");
  }
  if (sourceText.trim().length < 60) {
    throw new Error("Please provide at least 60 characters so the analyzer can give useful feedback.");
  }
  return analyzer.analyze(sourceText);
}

function buildLearningRoadmap(analysis) {
  const rolePriority = (analysis.roles && analysis.roles[0] && analysis.roles[0].title) || "your target role";
  const skills = Array.isArray(analysis.skills) ? analysis.skills.slice(0, 6) : [];
  const roadmap = [
    {
      title: "Strengthen your core profile",
      skill: skills[0] || "core technical skills",
      description: "Focus on the skills already showing up in your resume and turn them into clearer evidence with measurable project outcomes.",
      duration: "2-3 weeks"
    },
    {
      title: "Target role alignment",
      skill: rolePriority,
      description: "Map your strongest experience to the requirements of " + rolePriority + " and fill the biggest gaps with practical examples.",
      duration: "2-4 weeks"
    },
    {
      title: "Practice with real projects",
      skill: "portfolio build",
      description: "Build 1-2 portfolio projects that demonstrate the tools you already use and the role you want to pursue.",
      duration: "3-5 weeks"
    }
  ];

  const gapSkills = [];
  if (analysis.roles && analysis.roles.length) {
    analysis.roles.forEach(function (role) {
      role.missing.slice(0, 2).forEach(function (skill) {
        gapSkills.push(skill);
      });
    });
  }

  if (gapSkills.length) {
    roadmap.push({
      title: "Close skill gaps",
      skill: gapSkills.slice(0, 2).join(", "),
      description: "Prioritize the missing skills from your strongest role matches and practice them through short exercises or small projects.",
      duration: "1-3 weeks"
    });
  }

  return roadmap;
}

function parseUploadedTextFromFile(file) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error("No resume file was uploaded.");
  }

  const extension = (file.originalname.split(".").pop() || "").toLowerCase();
  const buffer = file.buffer;

  if (extension === "txt") {
    return buffer.toString("utf8");
  }

  if (extension === "pdf") {
    return extractPdfText(buffer);
  }

  if (extension === "docx") {
    return extractDocxText(buffer);
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT resume.");
}

async function extractPdfText(buffer) {
  const pdfPath = path.join(__dirname, "vendor", "pdfjs-dist-4.4.168", "build", "pdf.min.mjs");
  const workerPath = path.join(__dirname, "vendor", "pdfjs-dist-4.4.168", "build", "pdf.worker.min.mjs");
  const pdfjs = await import(pathToFileURL(pdfPath).href);
  const loadedPdf = pdfjs.default || pdfjs;
  loadedPdf.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  const documentProxy = await loadedPdf.getDocument({ data: buffer }).promise;

  if (documentProxy.numPages > 50) {
    throw new Error("This PDF has more than 50 pages. Choose a shorter resume file or paste the relevant text.");
  }

  const pages = [];
  for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
    const page = await documentProxy.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map(function (item) { return item.str || ""; }).join(" ");
    pages.push(pageText);
  }

  return pages.join("\n").trim();
}

function extractDocxText(buffer) {
  const zip = new AdmZip(buffer);
  const documentEntry = zip.getEntries().find(function (entry) {
    return entry.entryName.replace(/\\/g, "/").toLowerCase() === "word/document.xml";
  });

  if (!documentEntry) {
    throw new Error("This document does not contain a readable Word document body.");
  }

  const xml = documentEntry.getData().toString("utf8");
  const matches = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  const text = matches.map(function (match) {
    return decodeXml(match[1]);
  }).join(" ");

  return text.replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function (_, code) { return String.fromCodePoint(Number(code)); });
}

app.get("/health", function (_req, res) {
  res.json({
    ok: true,
    status: "ok",
    service: "Careerly resume analyzer",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", function (_req, res) {
  res.json({
    ok: true,
    status: "ok",
    service: "Careerly resume analyzer",
    timestamp: new Date().toISOString()
  });
});

app.post("/api/upload", upload.single("resume"), async function (req, res) {
  try {
    const text = req.file ? await parseUploadedTextFromFile(req.file) : (typeof req.body.resumeText === "string" ? req.body.resumeText : "");
    if (!text || !text.trim()) {
      throw new Error("No readable text was found in the uploaded file.");
    }

    const normalizedText = text.trim();
    res.json({
      ok: true,
      fileName: req.file ? req.file.originalname : "resume.txt",
      resumeText: normalizedText,
      wordCount: normalizedText.split(/\s+/).filter(Boolean).length
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: normalizeErrorMessage(error) });
  }
});

app.post("/api/analyze", async function (req, res) {
  try {
    const resumeText = typeof req.body && typeof req.body.resumeText === "string" ? req.body.resumeText : "";
    const analysis = analyzeResumeText(resumeText);
    res.json({
      ok: true,
      analysis: analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: normalizeErrorMessage(error) });
  }
});

app.post("/api/job-recommendations", async function (req, res) {
  try {
    const resumeText = typeof req.body && typeof req.body.resumeText === "string" ? req.body.resumeText : "";
    const targetRole = typeof req.body && typeof req.body.targetRole === "string" ? req.body.targetRole : "";
    const analysis = analyzeResumeText(resumeText);
    const recommendations = Array.isArray(analysis.roles) ? analysis.roles.map(function (role) {
      const roleTitle = role.title && role.title.toLowerCase() === targetRole.toLowerCase() ? role.title : role.title;
      return {
        title: roleTitle,
        matchScore: role.match,
        matchingSkills: role.matched,
        missingSkills: role.missing,
        explanation: roleTitle + " is a strong match when the resume demonstrates " + role.matched.slice(0, 4).join(", ") + "."
      };
    }) : [];

    res.json({ ok: true, recommendations: recommendations, targetRole: targetRole || (recommendations[0] && recommendations[0].title) || null });
  } catch (error) {
    res.status(400).json({ ok: false, error: normalizeErrorMessage(error) });
  }
});

app.post("/api/learning-roadmap", async function (req, res) {
  try {
    const resumeText = typeof req.body && typeof req.body.resumeText === "string" ? req.body.resumeText : "";
    const analysis = analyzeResumeText(resumeText);
    const roadmap = buildLearningRoadmap(analysis);
    res.json({ ok: true, roadmap: roadmap });
  } catch (error) {
    res.status(400).json({ ok: false, error: normalizeErrorMessage(error) });
  }
});

app.get("/api/history", function (_req, res) {
  res.json({ ok: true, history: analysisHistory.slice(0, 20) });
});

app.post("/api/history", function (req, res) {
  try {
    const payload = req.body || {};
    const analysis = payload.analysis || {};
    if (!analysis.summary && !payload.summary) {
      throw new Error("A saved analysis summary is required.");
    }

    const entry = {
      id: typeof payload.id === "string" ? payload.id : String(Date.now() + Math.random()),
      createdAt: new Date().toISOString(),
      fileName: payload.fileName || "resume",
      targetRole: payload.targetRole || null,
      score: analysis.score || payload.score || 0,
      summary: analysis.summary || payload.summary,
      skills: Array.isArray(analysis.skills) ? analysis.skills : [],
      suggestedDirection: analysis.suggestedDirection || payload.suggestedDirection || "Explore a direction that fits your interests"
    };

    analysisHistory.unshift(entry);
    res.status(201).json({ ok: true, entry: entry, history: analysisHistory.slice(0, 20) });
  } catch (error) {
    res.status(400).json({ ok: false, error: normalizeErrorMessage(error) });
  }
});

app.delete("/api/history/:id", function (req, res) {
  const { id } = req.params;
  const index = analysisHistory.findIndex(function (item) { return item.id === id; });
  if (index === -1) {
    res.status(404).json({ ok: false, error: "History record not found." });
    return;
  }

  analysisHistory.splice(index, 1);
  res.json({ ok: true, history: analysisHistory.slice(0, 20) });
});

app.delete("/api/history", function (_req, res) {
  analysisHistory.length = 0;
  res.json({ ok: true, history: [] });
});

function startServer() {
  const server = app.listen(port, function () {
    console.log("Careerly resume analyzer API listening on http://localhost:" + port);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, analysisHistory, analyzeResumeText, extractPdfText, extractDocxText };
