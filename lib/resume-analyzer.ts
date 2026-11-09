import knowledgeBase from "./data/resume-knowledge-base.json";

export interface SkillEntry {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  actionVerbs?: string[];
  bulletTemplates?: string[];
}

export interface BulletSuggestion {
  skill: string;
  category: string;
  actionVerb: string;
  bullet: string;
}

export interface TailoringAdvice {
  id: string;
  type: "add" | "remove";
  title: string;
  category: "keyword" | "metric" | "cliche" | "outdated_tech" | "seniority" | "formatting";
  reason: string;
  impact: "high" | "medium" | "low";
  foundSnippet?: string;
  suggestedAction: string;
}

export interface FitAnalysisResult {
  score: number; // 0 - 100
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: BulletSuggestion[];
  roleArchetype?: string;
  tailoringAdvice?: {
    toAdd: TailoringAdvice[];
    toRemove: TailoringAdvice[];
  };
  categoryBreakdown: {
    category: string;
    matched: number;
    total: number;
  }[];
  verdict: {
    label: string;
    description: string;
    color: "emerald" | "amber" | "rose";
  };
  analyzedAt: string;
}

// In-memory skills cache initialized from our zero-cost open-source database
let skillsCatalog: SkillEntry[] = knowledgeBase.skills as SkillEntry[];

/**
 * Normalizes text for clean token and substring boundary matching
 */
function normalizeText(text: string): string {
  return " " + text.toLowerCase().replace(/[\r\n\t]/g, " ").replace(/[^\w\s+#.-]/g, " ") + " ";
}

/**
 * Checks if a skill alias appears inside the normalized text as a whole word/boundary
 */
function containsAlias(normalizedHaystack: string, alias: string): boolean {
  const cleanAlias = alias.toLowerCase().trim();
  if (!cleanAlias) return false;

  // Escape regex special chars except + and #
  const escaped = cleanAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Boundary check: word boundary or surrounding whitespace/punctuation
  const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+-])${escaped}(?:$|[^a-zA-Z0-9_#+-])`, "i");
  return regex.test(normalizedHaystack);
}

/**
 * Extracts recognized skills from arbitrary text (resume, JD, notes, requirements)
 */
export function extractSkillsFromText(text: string): {
  skills: SkillEntry[];
  skillNames: string[];
  categories: Record<string, string[]>;
} {
  if (!text || typeof text !== "string") {
    return { skills: [], skillNames: [], categories: {} };
  }

  const normalized = normalizeText(text);
  const foundMap = new Map<string, SkillEntry>();
  const categories: Record<string, string[]> = {};

  for (const entry of skillsCatalog) {
    let matched = false;
    for (const alias of entry.aliases) {
      if (containsAlias(normalized, alias)) {
        matched = true;
        break;
      }
    }

    if (matched) {
      foundMap.set(entry.id, entry);
      if (!categories[entry.category]) {
        categories[entry.category] = [];
      }
      categories[entry.category].push(entry.name);
    }
  }

  const skills = Array.from(foundMap.values());
  const skillNames = skills.map((s) => s.name);

  return { skills, skillNames, categories };
}

const RESUME_CLICHES = [
  {
    regex: /\b(hard-working|hard worker)\b/i,
    phrase: "Hard-working",
    advice: "Replace vague self-declarations with specific examples of high-pressure deliveries or tight deadlines met.",
  },
  {
    regex: /\b(team player)\b/i,
    phrase: "Team player",
    advice: "Replace 'team player' with concrete collaboration details: e.g. 'Partnered with 4 engineers and product designers to ship...'",
  },
  {
    regex: /\b(detail-oriented|detail oriented)\b/i,
    phrase: "Detail-oriented",
    advice: "Delete 'detail-oriented'. Prove accuracy through automated test coverage, QA sign-off rate, or production zero-defect releases.",
  },
  {
    regex: /\b(self-motivated|self motivated)\b/i,
    phrase: "Self-motivated",
    advice: "Demonstrate autonomy by describing self-directed refactors, unprompted performance enhancements, or open-source tooling.",
  },
  {
    regex: /\b(results-driven|results driven|result-driven)\b/i,
    phrase: "Results-driven",
    advice: "Cut this generic label and lead immediately with your quantified accomplishments ($ savings, % latency drops, active users).",
  },
  {
    regex: /\b(quick learner|fast learner)\b/i,
    phrase: "Quick learner",
    advice: "Replace with evidence of rapid technology adoption: e.g. 'Ramped up on Go in 2 weeks to refactor legacy authentication service.'",
  },
  {
    regex: /\b(responsible for|duties included|responsibilities included)\b/i,
    phrase: "Responsible for / Duties included",
    advice: "Passive duty phrasing. Replace with strong active verbs like 'Architected', 'Engineered', 'Spearheaded', or 'Automated'.",
  },
  {
    regex: /\b(dynamic professional|go-getter|seasoned professional)\b/i,
    phrase: "Dynamic professional / Buzzword",
    advice: "ATS and recruiters filter out subjective labels. Clearly state your core domain, tech stack, and verifiable engineering track record.",
  },
];

const DEPRECATED_OR_DISTRACTING_TECH = [
  {
    regex: /\b(jquery)\b/i,
    name: "jQuery",
    advice: "Unless applying for a legacy maintenance role, remove jQuery. In modern React/Next.js/Vue ecosystems, it signals outdated practices.",
  },
  {
    regex: /\b(angularjs|angular 1\.[0-9]+)\b/i,
    name: "AngularJS (1.x)",
    advice: "AngularJS 1.x is sunset and end-of-life. If you also have modern React, Next.js, or Vue, remove or minimize 1.x to avoid legacy tagging.",
  },
  {
    regex: /\b(bower|grunt|gulp)\b/i,
    name: "Bower / Grunt / Gulp",
    advice: "Modern web standards use Vite, Webpack, Turbopack, or pnpm. Remove legacy task runners to keep technical skills contemporary.",
  },
  {
    regex: /\b(subversion|svn|cvs|mercurial)\b/i,
    name: "SVN / CVS (Legacy VCS)",
    advice: "Git is the universal standard. Mentioning legacy VCS tools wastes valuable resume real estate.",
  },
  {
    regex: /\b(flash|actionscript)\b/i,
    name: "Flash / ActionScript",
    advice: "Flash is deprecated industry-wide. Remove it completely to modernize your resume profile.",
  },
];

export function detectRoleArchetype(jobTitle: string, jobText: string): {
  role: string;
  level: "intern_junior" | "mid" | "senior_lead";
  keyFocus: string[];
} {
  const combined = (jobTitle + " " + jobText).toLowerCase();

  let level: "intern_junior" | "mid" | "senior_lead" = "mid";
  if (/\b(intern|internship|junior|entry level|graduate|trainee|apprentice|new grad)\b/i.test(combined)) {
    level = "intern_junior";
  } else if (/\b(senior|lead|staff|principal|director|head of|architect|manager)\b/i.test(combined)) {
    level = "senior_lead";
  }

  if (/\b(frontend|front-end|ui engineer|client|react|vue|web developer)\b/i.test(combined)) {
    return {
      role: "Frontend Engineer",
      level,
      keyFocus: ["UI Performance", "Component Architecture", "Accessibility (a11y)", "State Management"],
    };
  }

  if (/\b(backend|back-end|api|distributed|microservices|golang|python developer|java developer)\b/i.test(combined)) {
    return {
      role: "Backend Engineer",
      level,
      keyFocus: ["API Design", "High-Throughput Scaling", "Database Query Optimization", "Caching", "System Reliability"],
    };
  }

  if (/\b(devops|sre|site reliability|cloud|platform|infrastructure|kubernetes|terraform)\b/i.test(combined)) {
    return {
      role: "DevOps & Cloud Engineer",
      level,
      keyFocus: ["CI/CD Pipeline Speed", "Infrastructure as Code", "Container Orchestration", "Monitoring/Observability", "Cloud Cost Optimization"],
    };
  }

  if (/\b(mobile|ios|android|react native|flutter|swift|kotlin)\b/i.test(combined)) {
    return {
      role: "Mobile Engineer",
      level,
      keyFocus: ["App Store Deployments", "Offline-first Storage", "Native Performance", "Memory Management"],
    };
  }

  if (/\b(data engineer|machine learning|ml engineer|ai engineer|data science|nlp|llm)\b/i.test(combined)) {
    return {
      role: "Data & AI/ML Engineer",
      level,
      keyFocus: ["Data Pipeline Throughput", "Model Latency & Evaluation", "Vector DBs & RAG", "Data Quality"],
    };
  }

  if (/\b(qa|quality assurance|sdet|test automation|testing engineer)\b/i.test(combined)) {
    return {
      role: "QA & Automation Engineer",
      level,
      keyFocus: ["E2E Test Coverage", "Regression Prevention", "CI Test Execution Times", "Defect Detection"],
    };
  }

  return {
    role: "Full-Stack Software Engineer",
    level,
    keyFocus: ["End-to-End Feature Delivery", "Clean Architecture", "API Integration", "Database Schema Design"],
  };
}

export function generateTailoringAdvice(
  resumeText: string,
  job: {
    title?: string;
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
  },
  missingSkills: string[],
  matchedSkills: string[],
  roleInfo: { role: string; level: "intern_junior" | "mid" | "senior_lead"; keyFocus: string[] }
): {
  toAdd: TailoringAdvice[];
  toRemove: TailoringAdvice[];
} {
  const toAdd: TailoringAdvice[] = [];
  const toRemove: TailoringAdvice[] = [];
  const combinedJob = [job.title || "", ...(job.requirements || []), job.description || ""].join(" ").toLowerCase();

  // --- WHAT TO ADD ---
  // 1. Missing Core Keywords from Job
  for (const missing of missingSkills.slice(0, 4)) {
    toAdd.push({
      id: "add_skill_" + missing.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      type: "add",
      category: "keyword",
      impact: "high",
      title: `Add Skill: ${missing}`,
      reason: `Explicitly required for this ${roleInfo.role} position. Missing this keyword may fail initial ATS screening filters.`,
      suggestedAction: `Incorporate ${missing} into a relevant project bullet or your Technical Skills section if you have working familiarity.`,
    });
  }

  // 2. Metrics & Quantification Tailored to Archetype
  const hasNumbers = /\b([0-9]+%|\$[0-9]+|[0-9]+x|[0-9]+(\.[0-9]+)?(ms|s|k|m|rpm|rps|qps))\b/i.test(resumeText);
  if (!hasNumbers) {
    if (roleInfo.role.includes("Frontend")) {
      toAdd.push({
        id: "add_metric_frontend",
        type: "add",
        category: "metric",
        impact: "high",
        title: "Add Frontend Performance Metrics",
        reason: "Frontend screeners look for proof of performance engineering (Core Web Vitals, bundle size reduction, load time improvement).",
        suggestedAction: "Add quantifiable impact, e.g.: 'Reduced bundle size by 35% through code-splitting, improving Lighthouse performance score from 68 to 94.'",
      });
    } else if (roleInfo.role.includes("Backend") || roleInfo.role.includes("Full-Stack")) {
      toAdd.push({
        id: "add_metric_backend",
        type: "add",
        category: "metric",
        impact: "high",
        title: "Add Backend Scale & Latency Metrics",
        reason: "Backend and Full-Stack teams prioritize reliability and scale (requests/sec, database query time, uptime).",
        suggestedAction: "Add system throughput metrics, e.g.: 'Designed APIs supporting 5,000+ requests/sec with p99 response times under 120ms.'",
      });
    } else if (roleInfo.role.includes("DevOps")) {
      toAdd.push({
        id: "add_metric_devops",
        type: "add",
        category: "metric",
        impact: "high",
        title: "Add Deployment Speed & Cost Metrics",
        reason: "DevOps value is measured in developer velocity, pipeline build durations, and cloud cost efficiency.",
        suggestedAction: "Quantify velocity: 'Cut CI/CD release times from 45 minutes to 7 minutes and reduced monthly AWS spend by 22%.'",
      });
    }
  }

  // 3. Level-specific Additions
  if (roleInfo.level === "senior_lead") {
    const hasLeadership = /\b(mentored|led|spearheaded|architected|championed|cross-functional)\b/i.test(resumeText);
    if (!hasLeadership) {
      toAdd.push({
        id: "add_senior_leadership",
        type: "add",
        category: "seniority",
        impact: "high",
        title: "Add Senior Technical Leadership Signals",
        reason: `Applying for a Senior/Lead position requires demonstrating architectural decision-making and team enablement beyond individual coding.`,
        suggestedAction: "Add bullets highlighting system architecture ownership, mentoring engineers, or establishing engineering coding standards.",
      });
    }
  } else if (roleInfo.level === "intern_junior") {
    toAdd.push({
      id: "add_junior_projects",
      type: "add",
      category: "keyword",
      impact: "medium",
      title: "Highlight Deployed Live Projects & Demos",
      reason: `For entry-level or junior applicants, working live URLs, GitHub repos, and deployed demos stand out dramatically against applicant pools with only class notes.`,
      suggestedAction: "Include GitHub links and live URLs to 1-2 deployed full-stack or frontend projects with your exact contributions.",
    });
  }

  // --- WHAT TO REMOVE ---
  // 1. Clichés & Buzzwords in Resume
  for (const cliche of RESUME_CLICHES) {
    const match = resumeText.match(cliche.regex);
    if (match) {
      toRemove.push({
        id: "remove_cliche_" + cliche.phrase.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        type: "remove",
        category: "cliche",
        impact: "medium",
        title: `Remove Buzzword: "${match[0]}"`,
        foundSnippet: match[0],
        reason: "Vague soft-skill claims take up resume space without providing evidence. Technical screeners ignore empty buzzwords.",
        suggestedAction: cliche.advice,
      });
    }
  }

  // 2. Outdated / Deprecated Tech
  for (const tech of DEPRECATED_OR_DISTRACTING_TECH) {
    // Only flag if the target job does NOT mention it
    const jobWantsIt = tech.regex.test(combinedJob);
    if (!jobWantsIt) {
      const match = resumeText.match(tech.regex);
      if (match) {
        toRemove.push({
          id: "remove_tech_" + tech.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          type: "remove",
          category: "outdated_tech",
          impact: "medium",
          title: `Remove / De-emphasize: "${tech.name}"`,
          foundSnippet: match[0],
          reason: `The job demands modern tooling. Featuring ${tech.name} prominently can make your experience seem dated.`,
          suggestedAction: tech.advice,
        });
      }
    }
  }

  // 3. Seniority Misalignments
  if (roleInfo.level === "senior_lead") {
    const passiveMatch = resumeText.match(/\b(helped with|assisted with|assisted in|participated in|worked on)\b/i);
    if (passiveMatch) {
      toRemove.push({
        id: "remove_passive_senior",
        type: "remove",
        category: "seniority",
        impact: "high",
        title: `Replace Passive Phrasing: "${passiveMatch[0]}"`,
        foundSnippet: passiveMatch[0],
        reason: "Passive phrasing undermines leadership authority in Senior applications.",
        suggestedAction: "Replace with high-agency verbs: 'Architected', 'Spearheaded', 'Engineered', 'Optimized', or 'Directed'.",
      });
    }
  }

  return { toAdd, toRemove };
}

/**
 * Compares job posting details with a user's master resume
 */
export function analyzeJobFit(
  resumeText: string,
  job: {
    title?: string;
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
  }
): FitAnalysisResult {
  const now = new Date().toISOString();

  // If user has not provided a resume yet
  if (!resumeText || resumeText.trim().length === 0) {
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: [],
      suggestions: [],
      categoryBreakdown: [],
      tailoringAdvice: { toAdd: [], toRemove: [] },
      verdict: {
        label: "Resume Needed",
        description: "Upload your Master Resume to see instant ATS match score and recommendations.",
        color: "amber",
      },
      analyzedAt: now,
    };
  }

  // Combine job text for skill extraction
  const combinedJobText = [
    job.title || "",
    ...(job.requirements || []),
    ...(job.responsibilities || []),
    job.description || "",
  ].join("\n");

  const jobSkillsResult = extractSkillsFromText(combinedJobText);
  const resumeSkillsResult = extractSkillsFromText(resumeText);

  const resumeSkillIds = new Set(resumeSkillsResult.skills.map((s) => s.id));
  const resumeNormalized = normalizeText(resumeText);

  const matchedSkills: string[] = [];
  const missingSkillsList: SkillEntry[] = [];
  const categoryStats: Record<string, { matched: number; total: number }> = {};

  // Detect role archetype and key competencies
  const roleInfo = detectRoleArchetype(job.title || "", combinedJobText);

  // If the job didn't match any specific tech keywords in our dictionary
  if (jobSkillsResult.skills.length === 0) {
    const generalTailoring = generateTailoringAdvice(
      resumeText,
      job,
      [],
      resumeSkillsResult.skillNames.slice(0, 8),
      roleInfo
    );

    return {
      score: 75,
      matchedSkills: resumeSkillsResult.skillNames.slice(0, 8),
      missingSkills: [],
      suggestions: [],
      roleArchetype: roleInfo.role,
      tailoringAdvice: generalTailoring,
      categoryBreakdown: [],
      verdict: {
        label: "General Fit",
        description: "No specific technical constraints detected in job post. General qualifications apply.",
        color: "emerald",
      },
      analyzedAt: now,
    };
  }

  for (const jobSkill of jobSkillsResult.skills) {
    const cat = jobSkill.category;
    if (!categoryStats[cat]) {
      categoryStats[cat] = { matched: 0, total: 0 };
    }
    categoryStats[cat].total += 1;

    // Direct ID match or alias match against resume
    const hasInResume =
      resumeSkillIds.has(jobSkill.id) ||
      jobSkill.aliases.some((alias) => containsAlias(resumeNormalized, alias));

    if (hasInResume) {
      matchedSkills.push(jobSkill.name);
      categoryStats[cat].matched += 1;
    } else {
      missingSkillsList.push(jobSkill);
    }
  }

  // Calculate percentage
  const totalRequired = jobSkillsResult.skills.length;
  const matchCount = matchedSkills.length;
  const rawScore = totalRequired > 0 ? (matchCount / totalRequired) * 100 : 80;
  const score = Math.min(100, Math.max(15, Math.round(rawScore)));

  // Generate Google X-Y-Z Action Bullets for missing skills
  const suggestions: BulletSuggestion[] = [];

  for (const missing of missingSkillsList) {
    const verbs = missing.actionVerbs || ["Engineered", "Implemented", "Optimized", "Automated"];
    const actionVerb = verbs[0];

    let bullet = "";
    if (missing.bulletTemplates && missing.bulletTemplates.length > 0) {
      // Pick first template
      bullet = missing.bulletTemplates[0];
    } else {
      // Vetted Google X-Y-Z fallback formula: Accomplished [X] as measured by [Y] by doing [Z]
      bullet = `${actionVerb} ${missing.name} solutions within core architecture, reducing cycle latency by 30% and elevating system availability.`;
    }

    suggestions.push({
      skill: missing.name,
      category: missing.category,
      actionVerb,
      bullet,
    });
  }

  const categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    matched: stats.matched,
    total: stats.total,
  }));

  // Verdict definition
  let verdict: FitAnalysisResult["verdict"];
  if (score >= 75) {
    verdict = {
      label: "Strong Match",
      description: "Your master resume matches the majority of required skills for this position.",
      color: "emerald",
    };
  } else if (score >= 50) {
    verdict = {
      label: "Good Fit - Minor Gaps",
      description: "You meet key core qualifications. Adding the recommended keywords will beat the ATS.",
      color: "amber",
    };
  } else {
    verdict = {
      label: "Skill Gaps Identified",
      description: "Several required competencies are missing from your resume. Review recommended bullets.",
      color: "rose",
    };
  }

  // Generate actionable Role-Specific Add & Remove suggestions
  const tailoringAdvice = generateTailoringAdvice(
    resumeText,
    job,
    missingSkillsList.map((s) => s.name),
    matchedSkills,
    roleInfo
  );

  return {
    score,
    matchedSkills,
    missingSkills: missingSkillsList.map((s) => s.name),
    suggestions,
    roleArchetype: roleInfo.role,
    tailoringAdvice,
    categoryBreakdown,
    verdict,
    analyzedAt: now,
  };
}

/**
 * Optional background sync with public GitHub skill repository
 * Fetches latest skills without requiring any API keys or tokens.
 */
export async function syncSkillsFromGitHub(): Promise<{
  success: boolean;
  totalSkills: number;
  message: string;
}> {
  try {
    // Example: fetch open-source skills dataset
    const res = await fetch(
      "https://raw.githubusercontent.com/zauberware/skill-set-json/master/skills.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 }, // 24h cache
      }
    );

    if (!res.ok) {
      return {
        success: false,
        totalSkills: skillsCatalog.length,
        message: "Could not connect to GitHub raw endpoint; local catalog intact.",
      };
    }

    const githubSkills = await res.json();
    if (Array.isArray(githubSkills)) {
      const existingIds = new Set(skillsCatalog.map((s) => s.id));
      let added = 0;

      for (const item of githubSkills) {
        const name = typeof item === "string" ? item : item.name;
        if (!name) continue;
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        if (!existingIds.has(id)) {
          skillsCatalog.push({
            id,
            name,
            category: "General",
            aliases: [name.toLowerCase()],
            actionVerbs: ["Implemented", "Engineered"],
          });
          existingIds.add(id);
          added++;
        }
      }

      return {
        success: true,
        totalSkills: skillsCatalog.length,
        message: `Successfully synchronized ${added} new skills from GitHub.`,
      };
    }

    return {
      success: true,
      totalSkills: skillsCatalog.length,
      message: "Catalog is already up to date.",
    };
  } catch (err: any) {
    return {
      success: false,
      totalSkills: skillsCatalog.length,
      message: err.message || "Failed to sync from GitHub.",
    };
  }
}
