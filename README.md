# Careerly — Resume Analyzer

A backend-free, local-first resume review tool for students preparing for placements and internships.

## Run locally

You can open `index.html` directly for pasted-text, DOCX, and TXT analysis. To use PDF extraction, serve the folder over HTTP so the browser can load the PDF extraction library:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`. PDF.js is loaded from jsDelivr only when a PDF is selected. If the library cannot be reached, the app shows an error and you can paste the resume text instead. DOCX and TXT extraction work locally in the browser without an external library.

## What the analysis does

The current engine is a local heuristic analyzer, not a generative AI model. It identifies terms from a built-in skills vocabulary, checks for common resume sections and evidence cues, produces a content-grounded summary, compares detected skills with a small set of role profiles, and calculates a transparent checklist score. It may miss synonyms, context, and skills outside its vocabulary; it does not verify claims, assess visual formatting, or predict hiring outcomes.

Analysis is isolated in `analyzer.js` so an AI provider adapter can be added later. This browser-only version does not make AI requests or contain an API key.

## Privacy

Resume files and extracted text are processed in the browser and are not uploaded to an application server. PDF extraction downloads the PDF.js library code from jsDelivr, but does not send resume content to that CDN. DOCX and TXT extraction are local and do not require a CDN. Analysis history is off by default. When enabled in Settings, the app saves result summaries, detected skills, recommendations, score, and the file name in browser storage; it does not save the original file or full resume text. Clear saved data in Settings to remove local Careerly data.

## Supported files

- PDF: selectable text only; scanned/image-only PDFs need OCR, which is not included.
- DOCX: document text is extracted in the browser.
- TXT: plain text.
- Maximum file size: 5 MB.

Password-protected, corrupt, empty, unsupported, or textless documents produce an explicit error. You can always paste resume text instead.
