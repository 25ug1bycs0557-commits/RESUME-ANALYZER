# Careerly — Resume Analyzer

A backend-free, local-first resume review tool for students preparing for placements and internships.

## Run locally

You can open `index.html` directly for pasted-text, DOCX, and TXT analysis. To use PDF extraction, serve the folder over HTTP so the browser can load the PDF extraction library:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`. PDF.js is bundled locally and loaded only when a PDF is selected. DOCX and TXT extraction also work locally in the browser.

## Run tests

The analysis engine's unit and property-based tests use Node.js 18 or newer. Install the development dependency once, then run:

```powershell
npm install
npm test
```

Property tests use fast-check with a fixed seed and 150 generated cases per property. The test suite runs locally and does not call external AI services or network APIs.

## Backend API

The project now includes a lightweight Express API that keeps the existing browser-first analyzer as the default fallback while exposing structured endpoints for frontend integration and deployment. The app can run with either the static browser flow or the API-backed flow.

### Local backend startup

```powershell
npm install
npm start
```

The API listens on `http://localhost:3000` and exposes these primary endpoints:

- `GET /health` and `GET /api/health` — service health check
- `POST /api/upload` — accepts a PDF, DOCX, or TXT resume file and extracts readable text
- `POST /api/analyze` — returns the same rule-based analysis payload as the browser engine
- `POST /api/job-recommendations` — returns role recommendations and missing-skill gaps
- `POST /api/learning-roadmap` — returns a practical learning roadmap
- `GET /api/history`, `POST /api/history`, `DELETE /api/history/:id`, `DELETE /api/history` — in-memory saved analysis history

The API automatically falls back to the local analyzer when no external AI provider is configured. This keeps the app functional without fake AI claims or secret leakage.

### Environment configuration

Copy `.env.example` to `.env` and set local values if needed:

```powershell
Copy-Item .env.example .env
```

Supported variables:

- `PORT` — local backend port, default `3000`
- `ALLOWED_ORIGINS` — comma-separated allowed CORS origins
- `AI_PROVIDER` — optional, set to `local` unless a real provider is configured
- `AI_API_KEY` — server-side API key for a future external LLM
- `AI_API_URL` — optional OpenAI-compatible endpoint

No real secrets are included in the repository.

## Vercel deployment

This project is ready for a static-app deployment pattern with a serverless API route. The repository includes a Vercel-compatible `api/index.js` wrapper and a root `vercel.json` route for `/api/*` requests.

To deploy:

```powershell
npm install
vercel --prod
```

If your frontend and API are served from the same Vercel project, the browser app can use the relative `/api/...` path automatically. If the API is hosted separately, set `window.CAREERLY_API_BASE` in the browser to the API origin before analyzing a resume.

## Secret scanning

Install Gitleaks using its official installation instructions, then run `npm run security:secrets` before committing. To scan reachable Git history as well, run `npm run security:secrets:history`. Both commands redact detected secret values from output.

## What the analysis does

The current engine is a local heuristic analyzer, not a generative AI model. It identifies terms from a built-in skills vocabulary, checks for common resume sections and evidence cues, produces a content-grounded summary, compares detected skills with a small set of role profiles, and calculates a transparent checklist score. It may miss synonyms, context, and skills outside its vocabulary; it does not verify claims, assess visual formatting, or predict hiring outcomes.

Analysis is isolated in `analyzer.js` so an AI provider adapter can be added later. This browser-only version does not make AI requests or contain an API key.

## Privacy

Resume files and extracted text are processed in the browser and are not uploaded to an application server. PDF.js is bundled with the app, so PDF extraction does not contact a third-party code CDN. DOCX and TXT extraction also run locally. Analysis history is off by default. When enabled in Settings, the app saves result summaries, detected skills, recommendations, score, and the file name in browser storage; it does not save the original file or full resume text. Clear saved data in Settings to remove local Careerly data.

## Supported files

- PDF: selectable text only; scanned/image-only PDFs need OCR, which is not included.
- DOCX: document text is extracted in the browser.
- TXT: plain text.
- Maximum file size: 5 MB.

PDF.js 4.4.168 is included locally under the Apache-2.0 license; see [its license](./vendor/pdfjs-dist-4.4.168/LICENSE).

Password-protected, corrupt, empty, unsupported, or textless documents produce an explicit error. You can always paste resume text instead.
