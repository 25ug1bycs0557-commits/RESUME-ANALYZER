(function () {
  "use strict";

  const content = document.getElementById("pageContent");
  const fileInput = document.getElementById("fileInput");
  const toastRegion = document.getElementById("toastRegion");
  const HISTORY_KEY = "careerly.analysisHistory";
  const PREFS_KEY = "careerly.preferences";
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const pageNames = {
    dashboard: "Dashboard", analyze: "Analyze resume", history: "Analysis history",
    jobs: "Job recommendations", roadmap: "Learning roadmap", tips: "Resume tips", settings: "Settings"
  };
  let currentPage = "dashboard";
  let selectedFile = null;
  let extractedText = "";
  let latestAnalysis = null;
  let history = readHistory();
  let preferences = readPreferences();

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Could not read saved analysis history.", error);
      return [];
    }
  }

  function readPreferences() {
    try {
      return Object.assign({ saveHistory: false, darkMode: false }, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"));
    } catch (error) {
      console.warn("Could not read saved preferences.", error);
      return { saveHistory: false, darkMode: false };
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch (error) {
      notify("Your preference could not be saved in this browser.", "error");
      console.error("Could not save preferences.", error);
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function icon(name, size) {
    const paths = {
      upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
      spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      close: '<path d="m18 6-12 12M6 6l12 12"/>',
      briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
      trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };
    return '<svg class="icon" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.spark) + "</svg>";
  }

  function notify(message, type) {
    const toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(function () { toast.classList.add("toast-out"); window.setTimeout(function () { toast.remove(); }, 220); }, 3600);
  }

  function navigate(page) {
    if (!pageNames[page]) page = "dashboard";
    currentPage = page;
    window.history.replaceState(null, "", "#" + page);
    document.getElementById("pageCrumb").textContent = pageNames[page];
    document.querySelectorAll(".nav-link[data-page]").forEach(function (link) {
      link.classList.toggle("active", link.dataset.page === page);
    });
    document.getElementById("sidebar").classList.remove("mobile-open");
    render();
    window.scrollTo(0, 0);
  }

  function scoreRing(score, size) {
    const circumference = 2 * Math.PI * 43;
    const offset = circumference * (1 - score / 100);
    return '<div class="score-ring" style="--ring-offset:' + offset + 'px;--ring-size:' + (size || 116) + 'px"><svg viewBox="0 0 100 100" aria-label="Readiness score ' + score + ' out of 100"><circle class="ring-track" cx="50" cy="50" r="43"/><circle class="ring-value" cx="50" cy="50" r="43"/></svg><div class="ring-label"><strong>' + score + '</strong><span>out of 100</span></div></div>';
  }

  function emptyBlock(title, text, action, target) {
    return '<div class="empty-state"><div class="empty-icon">' + icon("file", 24) + '</div><h3>' + title + '</h3><p>' + text + '</p>' + (action ? '<button class="button button-primary" data-go="' + target + '">' + action + '</button>' : "") + "</div>";
  }

  function renderDashboard() {
    const analysis = latestAnalysis;
    const latest = history.slice(0, 3);
    return '<section class="welcome-row"><div><div class="eyebrow"><span class="eyebrow-line"></span> YOUR CAREER WORKSPACE</div><h1>Good things start with <span>being prepared.</span></h1><p class="page-lead">Turn your experience into a resume that is ready for what comes next.</p></div><div class="welcome-date"><span class="date-dot"></span> Placement season, on your terms</div></section>' +
      '<section class="hero-card"><div class="hero-copy"><span class="hero-kicker">' + icon("spark", 16) + ' YOUR NEXT STEP STARTS HERE</span><h2>Make your resume<br>work harder for you.</h2><p>Get practical, evidence-based feedback and role suggestions from the skills already in your resume.</p><button class="button button-light" data-go="analyze">Analyze my resume ' + icon("arrow", 17) + '</button><div class="hero-assurance">' + icon("lock", 14) + ' Private by design · Analysis runs in your browser</div></div><div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-document"><div class="art-doc-head"><span></span><i></i><i></i></div><div class="art-line wide"></div><div class="art-line"></div><div class="art-section-label">SKILLS</div><div class="art-tags"><i></i><i></i><i></i></div><div class="art-line wide"></div><div class="art-line short"></div><div class="art-check">' + icon("check", 15) + '</div></div><div class="art-floating float-score"><small>READINESS</small><strong>' + (analysis ? analysis.score + "%" : "—") + '</strong><span>' + (analysis ? "Your latest result" : "Ready when you are") + '</span></div><div class="art-floating float-skill"><span class="skill-spark">' + icon("spark", 16) + '</span><div><strong>' + (analysis ? analysis.skills.length + " skills found" : "Your skills, clearly") + '</strong><small>Based on your resume</small></div></div></div></section>' +
      '<section class="stats-grid">' +
      '<article class="stat-card"><div class="stat-top"><span>Resume readiness</span><span class="stat-icon blue">' + icon("trend", 18) + '</span></div><div class="stat-number">' + (analysis ? analysis.score + '<small>/ 100</small>' : "—") + '</div><p>' + (analysis ? "Latest local assessment" : "Analyze your resume to get started") + '</p></article>' +
      '<article class="stat-card"><div class="stat-top"><span>Skills identified</span><span class="stat-icon purple">' + icon("spark", 18) + '</span></div><div class="stat-number">' + (analysis ? analysis.skills.length : "—") + '</div><p>' + (analysis ? "Across " + Object.values(analysis.categories).filter(function (a) { return a.length; }).length + " skill categories" : "Your strengths, organized") + '</p></article>' +
      '<article class="stat-card"><div class="stat-top"><span>Suggested directions</span><span class="stat-icon green">' + icon("briefcase", 18) + '</span></div><div class="stat-number">' + (analysis ? analysis.roles.length : "—") + '</div><p>' + (analysis ? "Explore your role matches" : "Find paths aligned to your skills") + '</p></article>' +
      '<article class="stat-card"><div class="stat-top"><span>Saved analyses</span><span class="stat-icon amber">' + icon("clock", 18) + '</span></div><div class="stat-number">' + history.length + '</div><p>' + (preferences.saveHistory ? "Saved on this device" : "History saving is turned off") + '</p></article></section>' +
      '<div class="dashboard-grid"><section class="panel recent-panel"><div class="panel-heading"><div><h2>Recent analyses</h2><p>Your resume progress, at a glance.</p></div><button class="text-button" data-go="history">View history ' + icon("arrow", 15) + '</button></div>' +
      (latest.length ? '<div class="recent-list">' + latest.map(function (item) { return '<button class="recent-item" data-analysis="' + escapeHtml(item.createdAt) + '"><span class="recent-file">' + icon("file", 19) + '</span><span class="recent-name"><strong>' + escapeHtml(item.fileName || "Pasted resume") + '</strong><small>' + formatDate(item.createdAt) + '</small></span><span class="recent-score">' + item.score + '<small>/100</small></span><span class="recent-chevron">›</span></button>'; }).join("") + '</div>' : emptyBlock("Your progress will show up here", "Run an analysis to see your readiness score, skills, and recommendations.", "Analyze resume", "analyze")) +
      '</section><section class="panel quick-panel"><div class="panel-heading"><div><h2>Start with the essentials</h2><p>Small improvements add up.</p></div><span class="mini-spark">' + icon("spark", 17) + '</span></div><div class="quick-steps"><button data-go="analyze"><span class="step-number">01</span><span><strong>Upload or paste your resume</strong><small>PDF, DOCX, TXT, or plain text</small></span>' + icon("arrow", 16) + '</button><button data-go="jobs"><span class="step-number">02</span><span><strong>Explore career directions</strong><small>See roles that overlap with your skills</small></span>' + icon("arrow", 16) + '</button><button data-go="tips"><span class="step-number">03</span><span><strong>Make your next edit count</strong><small>Use practical, honest resume tips</small></span>' + icon("arrow", 16) + '</button></div></section></div>' +
      '<section class="preview-strip"><div class="preview-mark">' + icon("spark", 19) + '</div><div><strong>Made for students, not just recruiters.</strong><p>Use your actual experience to tell a clearer story—no invented credentials, no black-box score.</p></div><span class="preview-label">LOCAL-FIRST ANALYSIS</span></section>';
  }

  function renderAnalyze() {
    const fileInfo = selectedFile ? '<div class="file-card"><div class="file-type-icon">' + icon("file", 22) + '</div><div class="file-meta"><strong>' + escapeHtml(selectedFile.name) + '</strong><small>' + formatBytes(selectedFile.size) + ' · ' + escapeHtml(selectedFile.type || fileExtension(selectedFile.name).toUpperCase()) + '</small></div><span class="file-status">' + (extractedText ? '<i class="status-check">' + icon("check", 12) + '</i> Text extracted' : "Ready to extract") + '</span><button class="icon-button remove-file" id="removeFile" aria-label="Remove file">' + icon("close", 17) + '</button></div>' : "";
    return '<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> RESUME REVIEW</div><h1>Analyze your resume</h1><p class="page-lead">Get a clear picture of what is working—and what to improve next.</p></div><span class="local-pill">' + icon("lock", 14) + ' Processed on this device</span></section>' +
      '<div class="analysis-layout"><section class="panel input-panel"><div class="panel-heading"><div><h2>Share your resume</h2><p>Upload a document or paste your resume text.</p></div><span class="step-badge">STEP 01</span></div>' +
      '<div class="dropzone ' + (selectedFile ? "has-file" : "") + '" id="dropzone" role="button" tabindex="0" aria-label="Choose a resume file"><div class="upload-icon">' + icon("upload", 23) + '</div><strong>' + (selectedFile ? "Replace your resume file" : "Drop your resume here") + '</strong><p>or <button class="inline-link" id="browseFile" type="button">browse files</button> from your device</p><div class="supported-types"><span>PDF</span><span>DOCX</span><span>TXT</span><i>Up to 5 MB</i></div></div>' +
      fileInfo + '<div class="input-divider"><span>OR PASTE RESUME TEXT</span></div><label class="sr-only" for="resumeText">Paste resume text</label><textarea id="resumeText" class="resume-textarea" placeholder="Paste your resume content here. Include your education, skills, projects, and experience for the most useful feedback..." spellcheck="false">' + escapeHtml(extractedText) + '</textarea><div class="textarea-footer"><span id="charCount">' + extractedText.length + ' characters</span><button class="text-button subtle" id="clearText">Clear text</button></div><div id="inputError" class="input-error" role="alert"></div><div class="analysis-actions"><button class="button button-primary analyze-button" id="runAnalysis">' + icon("spark", 17) + ' Analyze resume</button><button class="button button-quiet" id="resetAnalysis">Reset</button></div><p class="privacy-note">' + icon("lock", 14) + '<span>Your file and resume text are processed locally in your browser. The document is not uploaded to a server. Analysis history is only saved if you opt in under Settings.</span></p></section>' +
      '<aside class="analysis-aside"><div class="panel aside-panel"><span class="aside-step">WHAT YOU WILL GET</span><h3>Feedback you can act on.</h3><div class="benefit-list"><div><span class="benefit-icon icon-blue">' + icon("file", 17) + '</span><p><strong>A clearer summary</strong><small>See the story your resume currently tells.</small></p></div><div><span class="benefit-icon icon-violet">' + icon("spark", 17) + '</span><p><strong>Skills, organized</strong><small>Find skills that are explicitly mentioned.</small></p></div><div><span class="benefit-icon icon-green">' + icon("briefcase", 17) + '</span><p><strong>Career directions</strong><small>Explore role overlap and useful next skills.</small></p></div><div><span class="benefit-icon icon-amber">' + icon("trend", 17) + '</span><p><strong>A transparent score</strong><small>Understand the checklist behind your score.</small></p></div></div></div><div class="notice-card"><span>' + icon("spark", 17) + '</span><p><strong>Honest by design</strong><br>Careerly uses local heuristics to identify resume content. It is not an LLM and does not verify claims or assess document visual layout.</p></div></aside></div>' +
      (latestAnalysis ? renderResult(latestAnalysis) : "");
  }

  function renderResult(data) {
    const populatedCategories = Object.keys(data.categories).filter(function (category) { return data.categories[category].length; });
    return '<section class="results-section" id="analysisResults"><div class="result-title"><div><div class="eyebrow"><span class="eyebrow-line"></span> YOUR RESULTS</div><h2>Here is your resume snapshot.</h2><p>Based only on content you provided. Review every suggestion before using it.</p></div><span class="local-pill">Local heuristic analysis</span></div><div class="result-grid"><article class="panel score-panel"><div class="result-card-heading"><div><h3>Readiness overview</h3><p>A checklist-based signal, not a hiring prediction.</p></div><span class="result-icon">' + icon("trend", 18) + '</span></div><div class="score-content">' + scoreRing(data.score) + '<div class="score-description"><strong>' + readinessLabel(data.score) + '</strong><p>' + data.wordCount + ' words scanned · ' + data.skills.length + ' explicit skills detected</p></div></div><div class="score-breakdown">' + Object.keys(data.scoreParts).map(function (key) { const points = data.scoreParts[key]; const max = { "Key sections": 30, "Relevant skills": 25, "Project & experience detail": 20, "Achievement evidence": 15, "Readability & structure": 10 }[key]; return '<div class="score-row"><span>' + escapeHtml(key) + '</span><div class="score-bar"><i style="width:' + Math.round(points / max * 100) + '%"></i></div><small>' + points + '<em>/' + max + '</em></small></div>'; }).join("") + '</div></article>' +
      '<article class="panel summary-panel"><div class="result-card-heading"><div><h3>Your resume, summarized</h3><p>Evidence noticed by the local analyzer.</p></div><span class="result-icon purple">' + icon("file", 18) + '</span></div><p class="summary-copy">' + escapeHtml(data.summary) + '</p><div class="fact-pills">' + (data.facts.education.length ? '<span>' + icon("check", 13) + ' Education cues found</span>' : '<span class="fact-missing">Education not detected</span>') + (data.facts.experience.length ? '<span>' + icon("check", 13) + ' Experience cues found</span>' : '<span class="fact-missing">Experience not detected</span>') + '</div><div class="inference-note"><strong>How to read this:</strong> Detected details are text matches, not independently verified facts. Profile and career direction are inferred from the listed content.</div></article></div>' +
      '<div class="result-grid result-grid-lower"><article class="panel skills-panel"><div class="result-card-heading"><div><h3>Skills snapshot</h3><p>Only skills explicitly detected in your text.</p></div><span class="count-pill">' + data.skills.length + ' found</span></div>' + (populatedCategories.length ? '<div class="skill-categories">' + populatedCategories.map(function (category) { return '<div class="skill-category"><strong>' + escapeHtml(category) + '</strong><div class="skill-chips">' + data.categories[category].map(function (skill) { return '<span>' + escapeHtml(skill) + '</span>'; }).join("") + '</div></div>'; }).join("") + '</div>' : '<p class="muted-copy">No skills from the local vocabulary were detected. This does not mean you have no skills; consider naming relevant tools and techniques explicitly.</p>') + '</article>' +
      '<article class="panel improvements-panel"><div class="result-card-heading"><div><h3>Good next edits</h3><p>Practical checks based on what was detected.</p></div><span class="result-icon amber">' + icon("spark", 18) + '</span></div>' + (data.improvements.length ? '<ul class="improvement-list">' + data.improvements.map(function (item) { return '<li><span>' + icon("arrow", 14) + '</span>' + escapeHtml(item) + '</li>'; }).join("") + '</ul>' : '<p class="muted-copy">No checklist gaps stood out. Consider tailoring this resume to a specific role.</p>') + '</article></div>' +
      '<div class="result-cta"><div><span class="cta-icon">' + icon("briefcase", 18) + '</span><strong>Ready to explore roles that fit?</strong><small>Your skill overlap can help you choose what to learn next.</small></div><button class="button button-primary" data-go="jobs">Explore job recommendations ' + icon("arrow", 16) + '</button></div></section>';
  }

  function renderHistory() {
    return '<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> YOUR PROGRESS</div><h1>Analysis history</h1><p class="page-lead">Revisit saved results and track how your resume evolves.</p></div>' + (history.length ? '<button class="button button-quiet" id="clearHistory">Clear saved history</button>' : "") + '</section><section class="panel history-panel">' +
      (history.length ? '<div class="history-table-wrap"><table class="history-table"><thead><tr><th>Resume</th><th>Date analyzed</th><th>Readiness</th><th>Skills detected</th><th></th></tr></thead><tbody>' + history.map(function (item) { return '<tr><td><span class="table-file">' + icon("file", 18) + '<strong>' + escapeHtml(item.fileName || "Pasted resume") + '</strong></span></td><td>' + formatDate(item.createdAt) + '</td><td><span class="table-score">' + item.score + '<small>/100</small></span></td><td>' + item.skills.length + ' skills</td><td><button class="text-button" data-analysis="' + escapeHtml(item.createdAt) + '">View results ' + icon("arrow", 14) + '</button></td></tr>'; }).join("") + '</tbody></table></div>' : emptyBlock("No saved analyses yet", preferences.saveHistory ? "Your next analysis will appear here. Resume text itself is never included in saved history." : "Analysis history is off by default. Turn it on in Settings if you want to keep result summaries on this device.", preferences.saveHistory ? "Analyze resume" : "Review privacy settings", preferences.saveHistory ? "analyze" : "settings")) +
      '<div class="history-privacy">' + icon("lock", 15) + ' Saved results stay in this browser. Original resume text and files are never stored in history.</div></section>';
  }

  function roleCards(roles) {
    if (!roles || !roles.length) return emptyBlock("Start with your resume", "Analyze your resume to see role suggestions based on explicitly detected skills.", "Analyze resume", "analyze");
    return '<div class="role-grid">' + roles.map(function (role, index) { return '<article class="panel role-card"><div class="role-card-top"><span class="role-number">0' + (index + 1) + '</span><span class="match-badge ' + (role.match >= 40 ? "match-good" : "") + '">' + role.match + '% overlap</span></div><h3>' + escapeHtml(role.title) + '</h3><p>' + (role.matched.length ? "Your resume mentions " + role.matched.slice(0, 4).join(", ") + (role.matched.length > 4 ? " and more" : "") + "." : "No direct skill matches found in the local vocabulary.") + '</p><div class="match-track"><i style="width:' + role.match + '%"></i></div><div class="role-card-foot"><span>' + role.matched.length + ' of ' + role.skills.length + ' role skills detected</span><button class="text-button" data-role-roadmap="' + escapeHtml(role.title) + '">View skill gaps ' + icon("arrow", 14) + '</button></div></article>'; }).join("") + '</div>';
  }

  function renderJobs() {
    const roles = latestAnalysis && latestAnalysis.roles;
    return '<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> FIND YOUR DIRECTION</div><h1>Job recommendations</h1><p class="page-lead">Explore career paths with skills that overlap your resume.</p></div></section><div class="callout-note">' + icon("spark", 18) + '<span><strong>Think of these as starting points, not predictions.</strong> Match percentages compare detected keywords with a small role-skill checklist. They are not a measure of your ability or employability.</span></div>' + (roles ? roleCards(roles) : roleCards(null));
  }

  function renderRoadmap() {
    const roles = latestAnalysis && latestAnalysis.roles;
    const role = roles && roles[0];
    const tasks = role ? role.missing.slice(0, 4) : [];
    return '<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> KEEP GROWING</div><h1>Learning roadmap</h1><p class="page-lead">Turn a career direction into a few manageable next steps.</p></div></section>' +
      (role ? '<section class="panel roadmap-hero"><div class="roadmap-symbol">' + icon("book", 23) + '</div><div><span class="eyebrow">A STARTING POINT BASED ON YOUR RESUME</span><h2>Build toward ' + escapeHtml(role.title) + '</h2><p>These are common skills often associated with this role that were not detected in your resume. They may not be missing from your actual experience.</p></div><span class="match-badge match-good">' + role.match + '% overlap</span></section><div class="roadmap-content"><section class="panel roadmap-list"><div class="panel-heading"><div><h2>Suggested focus areas</h2><p>Pick one at a time; adapt this to your interests.</p></div><span class="step-badge">' + tasks.length + ' TOPICS</span></div>' + (tasks.length ? '<div class="roadmap-items">' + tasks.map(function (skill, index) { return '<div class="roadmap-item"><div class="roadmap-step">' + (index + 1) + '</div><div><strong>' + escapeHtml(skill.charAt(0).toUpperCase() + skill.slice(1)) + '</strong><p>Learn the fundamentals, then apply them in a small project you can explain.</p><span class="time-estimate">' + icon("clock", 13) + ' Self-paced</span></div><a href="https://www.google.com/search?q=' + encodeURIComponent(skill + " beginner learning resources") + '" target="_blank" rel="noopener noreferrer" class="resource-link" aria-label="Find learning resources for ' + escapeHtml(skill) + '">Explore resources ' + icon("arrow", 14) + '</a></div>'; }).join("") + '</div>' : '<p class="muted-copy roadmap-complete">No gaps were identified by this checklist. Consider deepening a skill or building a portfolio project.</p>') + '</section><aside class="panel roadmap-tip"><span class="result-icon purple">' + icon("spark", 18) + '</span><h3>Make learning visible</h3><p>Choose a project that demonstrates the skill you are practicing. Document what you built, the decisions you made, and what you would improve.</p><button class="text-button" data-go="tips">See project-writing tips ' + icon("arrow", 14) + '</button></aside></div>' : emptyBlock("Your roadmap starts with a direction", "Analyze your resume first. We'll suggest a few learning topics aligned with the role skills your resume already mentions.", "Analyze resume", "analyze"));
  }

  function renderTips() {
    const tips = [
      ["Lead with relevance", "Adjust the order of skills and projects to match the role you are applying for. Keep the underlying claims accurate."],
      ["Make bullets concrete", "Use an action, the work you did, and its outcome. Add scale or numbers only when you can support them."],
      ["Show your contribution", "For team projects, state what you personally designed, implemented, tested, or coordinated."],
      ["Keep skills evidence-based", "List tools you can discuss confidently. Mention where you used important skills in a project or experience bullet."],
      ["Make it easy to scan", "Use clear section headings, consistent dates, concise bullets, and a readable layout. Avoid dense paragraphs."],
      ["Review every detail", "Check spelling, links, contact information, date consistency, and whether your resume is tailored to the opportunity."],
      ["Keep a master copy", "Maintain a complete version, then create a focused copy for each role. Save a PDF only after checking how it renders."]
    ];
    return '<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> PRACTICAL GUIDANCE</div><h1>Resume tips</h1><p class="page-lead">A few grounded ways to make your experience easier to understand.</p></div></section><div class="tips-grid">' + tips.map(function (tip, index) { return '<article class="panel tip-card"><div class="tip-index">0' + (index + 1) + '</div><h3>' + escapeHtml(tip[0]) + '</h3><p>' + escapeHtml(tip[1]) + '</p></article>'; }).join("") + '</div><div class="notice-card tips-disclaimer"><span>' + icon("spark", 17) + '</span><p>There is no single resume format that guarantees an interview. Follow application instructions and use examples you can honestly discuss.</p></div>';
  }

  function renderSettings() {
    return '<section class="page-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> YOUR PREFERENCES</div><h1>Settings</h1><p class="page-lead">Choose how Careerly behaves on this device.</p></div></section><div class="settings-grid"><section class="panel settings-panel"><div class="settings-group"><div class="settings-icon">' + icon("lock", 19) + '</div><div><h3>Privacy & history</h3><p>Resume files and extracted text are processed in this browser and are not uploaded. The app does not send resume content to an AI service.</p><label class="setting-row"><span><strong>Save analysis summaries on this device</strong><small>Stores the score, detected skills, recommendations, and file name in browser storage. Resume text and files are not saved.</small></span><input id="saveHistoryToggle" type="checkbox" ' + (preferences.saveHistory ? "checked" : "") + '><i class="toggle-ui"></i></label></div></div><div class="settings-group"><div class="settings-icon">' + icon("spark", 19) + '</div><div><h3>Analysis transparency</h3><p>Analysis is local and heuristic-based. It checks a built-in skill vocabulary and resume section cues. Results can miss synonyms or context and do not verify claims, assess formatting, or predict hiring outcomes.</p><div class="settings-static">Analysis engine <strong>Local heuristic · no API configured</strong></div></div></div><div class="settings-group"><div class="settings-icon">' + icon("file", 19) + '</div><div><h3>Clear local data</h3><p>Remove saved results and preferences from this browser. Your current browser theme will reset.</p><button class="button button-quiet danger-button" id="clearData">Clear saved data</button></div></div></section><aside class="settings-side"><div class="panel setting-about"><span class="brand-mark small-brand"><svg viewBox="0 0 24 24"><path d="M5 18V6l7 8 7-8v12"/><path d="M5 18h14"/></svg></span><h3>Careerly</h3><p>A local-first resume companion for students preparing for their next opportunity.</p><span class="version-label">BROWSER-ONLY VERSION</span></div></aside></div>';
  }

  function render() {
    const renderers = { dashboard: renderDashboard, analyze: renderAnalyze, history: renderHistory, jobs: renderJobs, roadmap: renderRoadmap, tips: renderTips, settings: renderSettings };
    content.innerHTML = renderers[currentPage]();
    bindPageEvents();
  }

  function bindPageEvents() {
    content.querySelectorAll("[data-go]").forEach(function (button) { button.addEventListener("click", function () { navigate(button.dataset.go); }); });
    content.querySelectorAll("[data-analysis]").forEach(function (button) {
      button.addEventListener("click", function () {
        const found = history.find(function (item) { return item.createdAt === button.dataset.analysis; });
        if (found) { latestAnalysis = found; navigate("analyze"); }
      });
    });
    content.querySelectorAll("[data-role-roadmap]").forEach(function (button) {
      button.addEventListener("click", function () {
        const target = latestAnalysis && latestAnalysis.roles.find(function (role) { return role.title === button.dataset.roleRoadmap; });
        if (target) latestAnalysis.roles = [target].concat(latestAnalysis.roles.filter(function (role) { return role.title !== target.title; }));
        navigate("roadmap");
      });
    });
    const dropzone = document.getElementById("dropzone");
    if (dropzone) {
      dropzone.addEventListener("click", function (event) { if (!event.target.closest("button")) fileInput.click(); });
      dropzone.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.click(); } });
      dropzone.addEventListener("dragover", function (event) { event.preventDefault(); dropzone.classList.add("drag-over"); });
      dropzone.addEventListener("dragleave", function () { dropzone.classList.remove("drag-over"); });
      dropzone.addEventListener("drop", function (event) { event.preventDefault(); dropzone.classList.remove("drag-over"); handleFile(event.dataTransfer.files[0]); });
      const browse = document.getElementById("browseFile");
      if (browse) browse.addEventListener("click", function (event) { event.stopPropagation(); fileInput.click(); });
      const remove = document.getElementById("removeFile");
      if (remove) remove.addEventListener("click", function () { clearFile(); });
      const textarea = document.getElementById("resumeText");
      textarea.addEventListener("input", function () { document.getElementById("charCount").textContent = textarea.value.length + " characters"; });
      document.getElementById("clearText").addEventListener("click", function () { textarea.value = ""; extractedText = ""; document.getElementById("charCount").textContent = "0 characters"; textarea.focus(); });
      document.getElementById("resetAnalysis").addEventListener("click", function () { clearFile(); latestAnalysis = null; render(); });
      document.getElementById("runAnalysis").addEventListener("click", runAnalysis);
    }
    const saveHistoryToggle = document.getElementById("saveHistoryToggle");
    if (saveHistoryToggle) saveHistoryToggle.addEventListener("change", function () {
      preferences.saveHistory = saveHistoryToggle.checked;
      if (!preferences.saveHistory) {
        history = [];
        try { localStorage.removeItem(HISTORY_KEY); } catch (error) { notify("Saved analyses could not be removed from browser storage.", "error"); console.error(error); }
      }
      savePreferences();
      notify(preferences.saveHistory ? "Analysis history is now enabled on this device." : "History disabled and saved analyses removed.");
    });
    const clearHistoryButton = document.getElementById("clearHistory");
    if (clearHistoryButton) clearHistoryButton.addEventListener("click", function () {
      history = [];
      try { localStorage.removeItem(HISTORY_KEY); render(); notify("Saved analysis history cleared."); }
      catch (error) { notify("Saved history could not be cleared.", "error"); console.error(error); }
    });
    const clearData = document.getElementById("clearData");
    if (clearData) clearData.addEventListener("click", function () {
      try { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(PREFS_KEY); history = []; preferences = { saveHistory: false, darkMode: false }; document.body.classList.remove("dark-mode"); latestAnalysis = null; render(); notify("Saved Careerly data cleared from this browser."); }
      catch (error) { notify("Saved data could not be cleared.", "error"); console.error(error); }
    });
  }

  function fileExtension(name) {
    const match = String(name).toLowerCase().match(/\.([^.]+)$/);
    return match ? match[1] : "";
  }

  function formatBytes(bytes) {
    return bytes < 1024 * 1024 ? (bytes < 1024 ? "<1 KB" : Math.round(bytes / 1024) + " KB") : (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function readinessLabel(score) {
    if (score >= 80) return "Strong foundation";
    if (score >= 60) return "Good progress";
    if (score >= 35) return "Room to strengthen";
    return "A starting point";
  }

  async function handleFile(file) {
    if (!file) return;
    const ext = fileExtension(file.name);
    if (!["pdf", "docx", "txt"].includes(ext)) { notify("Unsupported file. Choose a PDF, DOCX, or TXT resume.", "error"); return; }
    if (file.size > MAX_FILE_SIZE) { notify("This file is larger than 5 MB. Choose a smaller resume file.", "error"); return; }
    if (!file.size) { notify("This file is empty. Choose a resume with content.", "error"); return; }
    selectedFile = file;
    extractedText = "";
    render();
    const errorEl = document.getElementById("inputError");
    const dropzone = document.getElementById("dropzone");
    if (dropzone) {
      dropzone.classList.add("extracting");
      dropzone.setAttribute("aria-busy", "true");
      const instruction = dropzone.querySelector("strong");
      if (instruction) instruction.textContent = "Extracting your document…";
    }
    try {
      if (ext === "txt") {
        extractedText = await file.text();
      } else if (ext === "pdf") {
        extractedText = await extractPdf(file);
      } else {
        extractedText = await extractDocx(file);
      }
      if (!extractedText.trim()) throw new Error(ext === "pdf" ? "No selectable text was found. This may be a scanned or image-only PDF; OCR is not available in this browser version." : "No readable text was found in this document.");
      const textarea = document.getElementById("resumeText");
      if (textarea) { textarea.value = extractedText; document.getElementById("charCount").textContent = extractedText.length + " characters"; }
      const status = document.querySelector(".file-status");
      if (status) status.innerHTML = '<i class="status-check">' + icon("check", 12) + "</i> Text extracted";
      if (dropzone) {
        dropzone.classList.remove("extracting");
        dropzone.removeAttribute("aria-busy");
        dropzone.querySelector("strong").textContent = "Replace your resume file";
      }
      if (errorEl) errorEl.textContent = "";
      notify("Text extracted. Review it before analysis.");
    } catch (error) {
      if (dropzone) {
        dropzone.classList.remove("extracting");
        dropzone.removeAttribute("aria-busy");
        dropzone.querySelector("strong").textContent = "Replace your resume file";
      }
      if (errorEl) errorEl.textContent = error.message || "The document could not be read. Try another file or paste the text.";
      notify(error.message || "Could not extract text from this file.", "error");
      console.error("Resume extraction failed.", error);
    }
  }

  async function extractPdf(file) {
    let pdfjs;
    try { pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs"); }
    catch (error) { throw new Error("PDF text extraction could not load its browser library. Check your internet connection, or paste the resume text instead."); }
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
    let documentProxy;
    try { documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise; }
    catch (error) { throw new Error("This PDF could not be opened. It may be damaged or password-protected. Try exporting an unlocked PDF or paste the text."); }
    if (documentProxy.numPages > 50) throw new Error("This PDF has more than 50 pages. Choose a shorter resume file or paste the relevant text.");
    const pages = [];
    for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
      const page = await documentProxy.getPage(pageNumber);
      const items = await page.getTextContent();
      pages.push(items.items.map(function (item) { return item.str || ""; }).join(" "));
    }
    return pages.join("\n").trim();
  }

  async function extractDocx(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const maxDocumentXmlSize = 10 * 1024 * 1024;
    const minEndOffset = Math.max(0, bytes.length - 65557);
    let endOffset = -1;
    for (let offset = bytes.length - 22; offset >= minEndOffset; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) { endOffset = offset; break; }
    }
    if (endOffset < 0) {
      if (bytes.length >= 4 && view.getUint32(0, true) === 0xe011cfd0) {
        throw new Error("This DOCX is encrypted or password-protected. Save an unlocked copy or paste the resume text.");
      }
      throw new Error("This is not a valid DOCX archive. Try saving the document again or paste the resume text.");
    }

    const diskNumber = view.getUint16(endOffset + 4, true);
    const directoryDisk = view.getUint16(endOffset + 6, true);
    const diskEntries = view.getUint16(endOffset + 8, true);
    const entryCount = view.getUint16(endOffset + 10, true);
    const directoryOffset = view.getUint32(endOffset + 16, true);
    if (diskNumber !== 0 || directoryDisk !== 0 || diskEntries !== entryCount || entryCount === 0xffff || directoryOffset === 0xffffffff) {
      throw new Error("This DOCX uses an unsupported multi-disk or ZIP64 archive. Save it as a standard DOCX file and try again.");
    }

    let cursor = directoryOffset;
    let documentEntry = null;
    const decoder = new TextDecoder("utf-8");
    for (let index = 0; index < entryCount; index += 1) {
      if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) {
        throw new Error("This DOCX archive is damaged. Try saving the document again or paste the resume text.");
      }
      const flags = view.getUint16(cursor + 8, true);
      const compression = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const uncompressedSize = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localHeaderOffset = view.getUint32(cursor + 42, true);
      if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
        throw new Error("This DOCX uses ZIP64 archives, which are not supported yet. Save it as a standard DOCX file or paste the resume text.");
      }
      const entryEnd = cursor + 46 + nameLength + extraLength + commentLength;
      if (entryEnd > bytes.length) throw new Error("This DOCX archive is damaged. Try saving the document again or paste the resume text.");
      const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
      if (name.replace(/\\/g, "/").toLowerCase() === "word/document.xml") {
        documentEntry = { flags: flags, compression: compression, compressedSize: compressedSize, uncompressedSize: uncompressedSize, localHeaderOffset: localHeaderOffset };
      }
      cursor = entryEnd;
    }
    if (!documentEntry) throw new Error("This document does not contain a readable Word document body. Try a different DOCX file or paste the resume text.");
    if (documentEntry.flags & 1) throw new Error("This DOCX is encrypted or password-protected. Save an unlocked copy or paste the resume text.");
    if (documentEntry.uncompressedSize > maxDocumentXmlSize) {
      throw new Error("The document body is unusually large to extract safely. Save a smaller DOCX file or paste the resume text.");
    }

    const localOffset = documentEntry.localHeaderOffset;
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error("This DOCX archive is damaged. Try saving the document again or paste the resume text.");
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataOffset + documentEntry.compressedSize;
    if (dataEnd > bytes.length) throw new Error("This DOCX archive is incomplete. Try saving the document again or paste the resume text.");

    let xmlBytes;
    const compressedData = bytes.slice(dataOffset, dataEnd);
    if (documentEntry.compression === 0) {
      xmlBytes = compressedData;
    } else if (documentEntry.compression === 8) {
      if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot extract DOCX files locally. Update your browser or paste the resume text.");
      try {
        const stream = new Blob([compressedData]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        const reader = stream.getReader();
        const chunks = [];
        let totalSize = 0;
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          totalSize += result.value.length;
          if (totalSize > maxDocumentXmlSize) {
            await reader.cancel();
            throw new Error("The document body is unusually large to extract safely. Save a smaller DOCX file or paste the resume text.");
          }
          chunks.push(result.value);
        }
        xmlBytes = new Uint8Array(totalSize);
        let position = 0;
        chunks.forEach(function (chunk) { xmlBytes.set(chunk, position); position += chunk.length; });
      } catch (error) {
        if (error.message && error.message.indexOf("unusually large to extract safely") >= 0) throw error;
        throw new Error("This DOCX text could not be decompressed. The file may be damaged or use an unsupported compression format.");
      }
    } else {
      throw new Error("This DOCX uses an unsupported compression format. Save it as a standard DOCX file or paste the resume text.");
    }
    if (documentEntry.uncompressedSize && xmlBytes.length !== documentEntry.uncompressedSize) {
      throw new Error("This DOCX archive is incomplete or damaged. Try saving the document again or paste the resume text.");
    }

    const xml = new DOMParser().parseFromString(new TextDecoder("utf-8").decode(xmlBytes), "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("The DOCX document body contains invalid XML. Try saving the document again or paste the resume text.");
    function paragraphText(paragraph) {
      let text = "";
      function collect(node) {
        Array.from(node.childNodes).forEach(function (child) {
          if (child.nodeType !== 1) return;
          if (child.localName === "t") text += child.textContent || "";
          else if (child.localName === "tab") text += "\t";
          else if (child.localName === "br" || child.localName === "cr") text += "\n";
          else collect(child);
        });
      }
      collect(paragraph);
      return text;
    }
    return Array.from(xml.getElementsByTagNameNS("*", "p")).map(paragraphText).filter(Boolean).join("\n");
  }

  function clearFile() {
    selectedFile = null;
    extractedText = "";
    fileInput.value = "";
    render();
  }

  function runAnalysis() {
    const textarea = document.getElementById("resumeText");
    const errorBox = document.getElementById("inputError");
    const button = document.getElementById("runAnalysis");
    const text = textarea ? textarea.value : "";
    if (!text.trim()) { errorBox.textContent = "Add resume text or upload a file before running the analysis."; if (textarea) textarea.focus(); return; }
    if (text.trim().length < 60) { errorBox.textContent = "Please provide at least 60 characters so the analyzer can give useful feedback."; textarea.focus(); return; }
    errorBox.textContent = "";
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> Analyzing on this device…';
    window.setTimeout(function () {
      try {
        latestAnalysis = ResumeAnalyzer.analyze(text);
        latestAnalysis.fileName = selectedFile ? selectedFile.name : "Pasted resume";
        if (preferences.saveHistory) {
          const savedResult = Object.assign({}, latestAnalysis, {
            summary: "This resume included " + latestAnalysis.skills.length + " explicitly detected skills. " + latestAnalysis.suggestedDirection + " is one direction to explore.",
            facts: {
              education: latestAnalysis.sections.education ? ["Education section detected"] : [],
              experience: latestAnalysis.sections.experience ? ["Experience section detected"] : [],
              projects: latestAnalysis.sections.projects ? ["Projects section detected"] : [],
              achievements: latestAnalysis.facts.achievements.length ? ["Achievement evidence detected"] : []
            }
          });
          history = [savedResult].concat(history.filter(function (entry) { return entry.createdAt !== savedResult.createdAt; })).slice(0, 20);
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
          catch (error) { notify("Analysis completed, but history could not be saved in browser storage.", "error"); console.error("Could not save history.", error); }
        }
        render();
        window.setTimeout(function () { const results = document.getElementById("analysisResults"); if (results) results.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
      } catch (error) {
        errorBox.textContent = error.message || "Analysis could not be completed.";
        button.disabled = false;
        button.innerHTML = icon("spark", 17) + " Analyze resume";
      }
    }, 420);
  }

  fileInput.addEventListener("change", function () { handleFile(fileInput.files[0]); });
  document.querySelectorAll(".nav-link[data-page]").forEach(function (link) {
    link.addEventListener("click", function (event) { event.preventDefault(); navigate(link.dataset.page); });
  });
  document.getElementById("themeToggle").addEventListener("click", function () {
    preferences.darkMode = !preferences.darkMode;
    document.body.classList.toggle("dark-mode", preferences.darkMode);
    savePreferences();
  });
  document.getElementById("mobileMenu").addEventListener("click", function () { document.getElementById("sidebar").classList.toggle("mobile-open"); });
  document.addEventListener("click", function (event) {
    if (!event.target.closest("#sidebar") && !event.target.closest("#mobileMenu")) document.getElementById("sidebar").classList.remove("mobile-open");
  });
  document.body.classList.toggle("dark-mode", preferences.darkMode);
  navigate(window.location.hash.slice(1) || "dashboard");
  window.addEventListener("hashchange", function () {
    const page = window.location.hash.slice(1);
    if (pageNames[page] && page !== currentPage) navigate(page);
  });
}());
