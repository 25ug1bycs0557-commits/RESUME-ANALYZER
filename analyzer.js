(function (root) {
  "use strict";

  const SKILL_GROUPS = {
    "Programming languages": ["javascript", "typescript", "python", "java", "c++", "c#", "c", "go", "golang", "rust", "php", "ruby", "kotlin", "swift", "r", "sql"],
    "Frameworks & libraries": ["html", "css", "react", "angular", "vue", "node.js", "nodejs", "express", "django", "flask", "fastapi", "spring boot", "spring", "next.js", "nextjs", "bootstrap", "tailwind css", "pandas", "numpy", "tensorflow", "pytorch", "scikit-learn", "scikit learn"],
    "Databases": ["postgresql", "postgres", "mysql", "mongodb", "mongo db", "sqlite", "redis", "firebase", "oracle", "dynamodb", "sql server"],
    "Tools & platforms": ["git", "github", "docker", "kubernetes", "aws", "azure", "google cloud", "gcp", "linux", "figma", "jira", "tableau", "power bi", "excel", "jenkins", "postman"],
    "Professional skills": ["communication", "leadership", "teamwork", "problem solving", "problem-solving", "critical thinking", "adaptability", "time management", "collaboration", "creativity", "public speaking"]
  };

  const ROLE_PROFILES = [
    { title: "Frontend Developer", skills: ["javascript", "typescript", "react", "angular", "vue", "html", "css", "git"], focus: ["typescript", "react", "testing", "accessibility"] },
    { title: "Backend Developer", skills: ["python", "java", "node.js", "nodejs", "express", "django", "flask", "fastapi", "spring", "sql", "postgresql", "mongodb", "docker"], focus: ["api design", "system design", "testing", "cloud"] },
    { title: "Full-stack Developer", skills: ["javascript", "typescript", "react", "node.js", "nodejs", "express", "sql", "mongodb", "git", "html", "css"], focus: ["typescript", "testing", "deployment", "system design"] },
    { title: "Data Analyst", skills: ["python", "sql", "excel", "tableau", "power bi", "pandas", "numpy", "statistics"], focus: ["sql", "statistics", "data visualization", "storytelling"] },
    { title: "Machine Learning Engineer", skills: ["python", "pandas", "numpy", "tensorflow", "pytorch", "scikit-learn", "scikit learn", "sql"], focus: ["model evaluation", "feature engineering", "deployment", "statistics"] },
    { title: "Cloud / DevOps Engineer", skills: ["aws", "azure", "google cloud", "gcp", "docker", "kubernetes", "linux", "git", "jenkins"], focus: ["linux", "docker", "ci/cd", "cloud architecture"] },
    { title: "Java Software Engineer", skills: ["java", "spring", "spring boot", "sql", "git", "docker", "mongodb"], focus: ["data structures", "spring boot", "testing", "system design"] },
    { title: "UI/UX Designer", skills: ["figma", "communication", "creativity", "user research", "prototyping", "design systems"], focus: ["user research", "prototyping", "accessibility", "case studies"] }
  ];

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function hasTerm(text, term) {
    const pattern = new RegExp("(^|[^a-z0-9+#])" + escapeRegExp(term).replace(/\\ /g, "\\s+") + "(?=$|[^a-z0-9+#])", "i");
    return pattern.test(text);
  }

  function findItems(text, items) {
    return items.filter(function (item) { return hasTerm(text, item); });
  }

  function splitSentences(text) {
    return text.split(/(?<=[.!?])\s+|\n+/).map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function analyze(inputText) {
    const text = String(inputText || "").replace(/\r/g, "").trim();
    if (text.length < 60) throw new Error("Please add at least 60 characters of resume text so the local analyzer can give useful feedback.");
    const normalized = text.toLowerCase();
    const categories = {};
    Object.keys(SKILL_GROUPS).forEach(function (category) { categories[category] = findItems(normalized, SKILL_GROUPS[category]); });
    const skills = Array.from(new Set(Object.values(categories).flat()));
    const sentences = splitSentences(text);
    const lines = text.split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
    const educationMatches = lines.filter(function (line) { return /\b(university|college|bachelor|master|b\.?tech|b\.?e\.?|m\.?tech|degree|education|gpa|cgpa|diploma)\b/i.test(line); }).slice(0, 4);
    const experienceMatches = lines.filter(function (line) { return /\b(intern|experience|developer|engineer|analyst|work history|employment)\b/i.test(line); }).slice(0, 4);
    const projectMatches = lines.filter(function (line) { return /\b(project|built|developed|implemented|created|designed)\b/i.test(line); }).slice(0, 5);
    const achievementMatches = sentences.filter(function (sentence) { return /\b(increased|improved|reduced|achieved|award|published|led|ranked|percent|%|\d+\+)\b/i.test(sentence); }).slice(0, 3);
    const sections = {
      contact: /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text) || /\b(\+?\d[\d\s().-]{7,}\d)\b/.test(text),
      summary: /\b(summary|objective|profile|about me)\b/i.test(text),
      education: /\b(education|university|college|bachelor|master|b\.?tech|b\.?e\.?)\b/i.test(text),
      experience: /\b(experience|internship|employment|work history)\b/i.test(text),
      projects: /\b(projects?|portfolio)\b/i.test(text),
      skills: /\b(skills|technologies|technical stack|competencies)\b/i.test(text)
    };
    const sectionCount = Object.values(sections).filter(Boolean).length;
    const quantified = (text.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
    const bulletCount = (text.match(/(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+/g) || []).length;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const scoreParts = {
      "Key sections": Math.round(sectionCount / 6 * 30),
      "Relevant skills": Math.min(25, skills.length * 3),
      "Project & experience detail": Math.min(20, projectMatches.length * 4 + Math.min(experienceMatches.length, 2) * 2),
      "Achievement evidence": Math.min(15, achievementMatches.length * 5 + Math.min(quantified, 3)),
      "Readability & structure": Math.min(10, Math.max(0, (bulletCount ? 5 : 2) + (wordCount >= 100 && wordCount <= 900 ? 5 : 2)))
    };
    const score = Math.min(100, Object.values(scoreParts).reduce(function (sum, n) { return sum + n; }, 0));
    const profile = skills.length ? "A candidate with evidence of " + skills.slice(0, 4).join(", ") + (skills.length > 4 ? " and related skills" : "") + "." : "A candidate whose resume currently provides limited explicit technical-skill evidence.";
    const summary = [
      profile,
      educationMatches.length ? "Education cues found: " + educationMatches.slice(0, 2).join("; ") + "." : "No clear education details were detected.",
      experienceMatches.length ? "Experience-related entries found: " + experienceMatches.slice(0, 2).join("; ") + "." : "No clear work or internship entry was detected.",
      projectMatches.length ? "Project evidence includes: " + projectMatches.slice(0, 2).join("; ") + "." : "Add project details to make practical experience easier to assess.",
      achievementMatches.length ? "Potential achievement evidence: " + achievementMatches[0] : "No quantified or clearly stated achievement was detected."
    ].join(" ");

    const recommendations = ROLE_PROFILES.map(function (role) {
      const matched = role.skills.filter(function (skill) { return hasTerm(normalized, skill); });
      return { title: role.title, skills: role.skills, matched: matched, missing: role.focus.filter(function (skill) { return !hasTerm(normalized, skill); }), match: Math.round(matched.length / role.skills.length * 100) };
    }).sort(function (a, b) { return b.match - a.match; }).slice(0, 4);
    const improvements = [];
    if (!sections.contact) improvements.push("Add a professional email address and a reliable way to reach you.");
    if (!sections.summary) improvements.push("Add a short profile statement tailored to the roles you want.");
    if (!sections.projects) improvements.push("Create a projects section with your contribution, tools, and outcome for each project.");
    if (!sections.experience) improvements.push("Include internship, volunteering, or relevant practical experience where applicable.");
    if (!sections.skills) improvements.push("Add a concise skills section, grouped by category and limited to skills you can demonstrate.");
    if (achievementMatches.length === 0) improvements.push("Strengthen bullet points with specific outcomes, scale, or measurable results where truthful.");
    if (bulletCount < 3) improvements.push("Use concise bullet points so recruiters can scan your contributions quickly.");
    if (wordCount < 120) improvements.push("Add enough context for projects and experience; your resume text is currently very brief.");
    if (wordCount > 900) improvements.push("Consider tightening the resume so the most relevant evidence is easy to find.");

    const overallDirection = recommendations[0] && recommendations[0].match > 0 ? recommendations[0].title : "Explore a direction that fits your interests";
    return {
      createdAt: new Date().toISOString(),
      wordCount: wordCount,
      summary: summary,
      facts: { education: educationMatches, experience: experienceMatches, projects: projectMatches, achievements: achievementMatches },
      categories: categories,
      skills: skills,
      sections: sections,
      score: score,
      scoreParts: scoreParts,
      roles: recommendations,
      improvements: improvements.slice(0, 6),
      suggestedDirection: overallDirection,
      method: "Local heuristic analysis"
    };
  }

  root.ResumeAnalyzer = Object.freeze({ analyze: analyze });
}(window));
