# Careerly API Documentation

## Overview

The Careerly backend exposes a lightweight local API for resume upload, analysis, career matching, and saved history. It keeps the existing browser-only analyzer as the default local fallback and adds a consistent JSON API surface for frontend integration and Vercel-compatible deployment.

## Base URL

- Local development: `http://localhost:3000`
- Production: use the deployed Vercel domain or configured reverse proxy

## Endpoints

### GET /health

Checks whether the API is online.

Example response:

```json
{
  "ok": true,
  "status": "ok",
  "service": "Careerly resume analyzer",
  "timestamp": "2026-10-30T00:00:00.000Z"
}
```

### POST /api/upload

Accepts a single uploaded resume file via `multipart/form-data` or a raw `resumeText` string in JSON.

Required fields:

- `resume`: file upload (PDF, DOCX, or TXT)
- or `resumeText`: plain-text resume content

Example response:

```json
{
  "ok": true,
  "fileName": "resume.pdf",
  "resumeText": "Alex Example ...",
  "wordCount": 186
}
```

### POST /api/analyze

Runs the resume analysis engine using the provided text.

Request body:

```json
{
  "resumeText": "Alex Example ..."
}
```

Example response:

```json
{
  "ok": true,
  "analysis": {
    "score": 84,
    "skills": ["javascript", "react", "sql"],
    "suggestedDirection": "Frontend Developer"
  },
  "generatedAt": "2026-10-30T00:00:00.000Z"
}
```

### POST /api/job-recommendations

Returns role matches and skill gaps for a resume.

Request body:

```json
{
  "resumeText": "Alex Example ...",
  "targetRole": "Frontend Developer"
}
```

### POST /api/learning-roadmap

Builds a prioritized coaching roadmap for missing concepts and skill gaps.

Request body:

```json
{
  "resumeText": "Alex Example ..."
}
```

### GET /api/history

Returns saved analysis history entries in memory.

### POST /api/history

Stores a summary of the completed analysis.

Request body:

```json
{
  "fileName": "resume.pdf",
  "summary": "Strong frontend candidate",
  "targetRole": "Frontend Developer",
  "score": 84,
  "analysis": {
    "score": 84,
    "summary": "Strong frontend candidate",
    "skills": ["javascript", "react", "sql"],
    "suggestedDirection": "Frontend Developer"
  }
}
```

### DELETE /api/history/:id

Removes a single saved history record.

### DELETE /api/history

Clears all saved analysis history.

## Error responses

All validation and processing failures return a JSON object with `ok: false` and an `error` message, for example:

```json
{
  "ok": false,
  "error": "Please provide at least 60 characters so the analyzer can give useful feedback."
}
```

## Security notes

- API keys and secrets should stay in `.env` files and are never exposed to the browser.
- Uploads are validated for file type and size.
- The app does not store full resumes permanently unless a user explicitly saves a brief summary in browser storage or a backend database is configured.
- If a production database is later enabled, use Supabase with proper RLS policies and non-sensitive summary storage.
