export interface ScrapedJobData {
  company: string;
  position: string;
  location?: string;
  salary?: number;
  salaryText?: string;
  jobUrl: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  recruiterContact?: string;
  notes?: string;
  tags?: string[];
}

// Convert HTML to cleanly formatted text preserving lists and headings
export function htmlToCleanText(rawHtml: string): string {
  if (!rawHtml) return "";

  let text = rawHtml;

  // Remove script, style, noscript, svg, nav, footer tags and content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ");
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

  // Convert list items to bullet points
  text = text.replace(/<li[^>]*>/gi, "\n• ");
  text = text.replace(/<\/li>/gi, "");

  // Convert headings and bold labels to section markers
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n\n### $1\n");
  text = text.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, "\n**$1**\n");

  // Convert paragraphs and line breaks to newlines
  text = text.replace(/<br\s*[\/]?>/gi, "\n");
  text = text.replace(/<\/?(?:p|div|section|article)[^>]*>/gi, "\n");

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "...");

  // Normalize excessive whitespace and lines
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0))
    .join("\n")
    .trim();

  return text;
}

function extractCompanyFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // Greenhouse: boards.greenhouse.io/{company}/jobs/...
    if (host.includes("greenhouse.io")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length > 0 && parts[0] !== "embed") {
        return capitalize(parts[0]);
      }
    }

    // Lever: jobs.lever.co/{company}/...
    if (host.includes("lever.co")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        return capitalize(parts[0]);
      }
    }

    // Ashby: jobs.ashbyhq.com/{company}/...
    if (host.includes("ashbyhq.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        return capitalize(parts[0]);
      }
    }

    // Workday: {company}.wd1.myworkdayjobs.com
    if (host.includes("myworkdayjobs.com")) {
      const sub = host.split(".")[0];
      return capitalize(sub);
    }

    // Company career pages: careers.google.com -> Google
    const domainParts = host.replace(/^www\./, "").split(".");
    if (domainParts.length >= 2) {
      const name =
        domainParts[0] === "careers" || domainParts[0] === "jobs"
          ? domainParts[1]
          : domainParts[0];
      return capitalize(name);
    }
  } catch {
    // ignore
  }
  return "";
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Extract bullet points following a specific heading in plain text
function extractBulletsUnderHeading(text: string, headingRegex: RegExp): string[] {
  const lines = text.split("\n");
  const bullets: string[] = [];
  let capturing = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line matches the target section heading
    if (headingRegex.test(line)) {
      capturing = true;
      continue;
    }

    // If capturing and we hit a new major section heading, stop
    if (
      capturing &&
      (line.startsWith("###") ||
        line.startsWith("**") ||
        /^(Requirements|Qualifications|Benefits|What we offer|About us|About the team|Compensation|Salary|How to apply|Equal Opportunity|About the Company):?$/i.test(
          line
        ))
    ) {
      break;
    }

    if (capturing) {
      if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
        const cleaned = line.replace(/^[•\-*]\s*/, "").trim();
        if (cleaned.length > 5) bullets.push(cleaned);
      } else if (line.length > 20 && !line.startsWith("#")) {
        // Long sentence in paragraph form under the section
        bullets.push(line);
      }
    }

    // Limit to 12 items max per section
    if (bullets.length >= 12) break;
  }

  return bullets;
}

// Extract salary information from text
function extractSalaryDetails(text: string): { salary?: number; salaryText?: string } {
  // Pattern: $120,000 - $180,000 or $140k - $160k or €90,000 or £70,000
  const salaryRegex =
    /(?:[\$€£]|USD|EUR|GBP)\s*([0-9]{2,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]{2,3}k\b)(?:\s*(?:-|–|—|to)\s*[\$€£]?\s*([0-9]{2,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]{2,3}k\b))?(?:\s*(?:\/|per|\ba\b)\s*(?:year|annum|yr|mo|month|hr|hour))?/i;

  const match = text.match(salaryRegex);
  if (match) {
    const salaryText = match[0].trim();
    // Parse numeric value
    let numStr = match[1].toLowerCase().replace(/,/g, "");
    if (numStr.endsWith("k")) {
      numStr = (parseFloat(numStr) * 1000).toString();
    }
    const num = parseFloat(numStr);
    return {
      salary: !isNaN(num) && num > 1000 ? num : undefined,
      salaryText,
    };
  }
  return {};
}

// Extract recruiter/HR contact info
function extractRecruiterContact(text: string): string | undefined {
  // Look for email addresses
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
  const emailMatch = text.match(emailRegex);
  if (emailMatch && !emailMatch[1].endsWith(".png") && !emailMatch[1].endsWith(".jpg")) {
    return emailMatch[1];
  }

  // Look for recruiter mention: "Contact: Sarah Jenkins" or "Recruiter: John"
  const recruiterRegex = /(?:recruiter|talent acquisition|hiring manager|contact|reach out to)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const recMatch = text.match(recruiterRegex);
  if (recMatch) {
    return recMatch[1];
  }

  return undefined;
}

// Extract main job description container from HTML if JSON-LD is missing
function extractJobDescriptionFromHtml(html: string): string {
  // Selectors prioritized by platform
  const containerRegexes = [
    // LinkedIn exact job details container
    /<div[^>]*class=["'][^"']*(?:show-more-less-html__markup|decorated-job-posting__details)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    // Greenhouse
    /<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
    // Lever
    /<div[^>]*class=["'][^"']*(?:section-page|posting-description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    // Indeed
    /<div[^>]*id=["']jobDescriptionText["'][^>]*>([\s\S]*?)<\/div>/i,
    // Ashby
    /<div[^>]*class=["'][^"']*_description_[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    // Workday
    /<div[^>]*data-automation-id=["']jobPostingDescription["'][^>]*>([\s\S]*?)<\/div>/i,
    // Generic
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=["'][^"']*(?:job-description|jobDescription|job-details)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const regex of containerRegexes) {
    const match = html.match(regex);
    if (match && match[1] && match[1].length > 100) {
      return htmlToCleanText(match[1]);
    }
  }

  return "";
}

export function parseJobFromHtml(html: string, url: string): ScrapedJobData {
  let company = "";
  let position = "";
  let location = "";
  let salary: number | undefined;
  let salaryText: string | undefined;
  let rawDescriptionHtml = "";
  let fullCleanedDescription = "";
  const tags: string[] = [];

  // --- 1. Schema.org JSON-LD (Primary Gold Mine) ---
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (
          item["@type"] === "JobPosting" ||
          (Array.isArray(item["@type"]) && item["@type"].includes("JobPosting"))
        ) {
          if (item.title && !position) {
            position = htmlToCleanText(item.title);
          }
          if (item.hiringOrganization?.name && !company) {
            company = htmlToCleanText(item.hiringOrganization.name);
          }
          if (item.jobLocation && !location) {
            const addr = item.jobLocation.address;
            if (typeof addr === "string") {
              location = htmlToCleanText(addr);
            } else if (addr) {
              const locParts = [
                addr.addressLocality,
                addr.addressRegion,
                addr.addressCountry,
              ].filter(Boolean);
              location = locParts.join(", ");
            }
          }
          if (item.baseSalary?.value?.value) {
            const s = Number(item.baseSalary.value.value);
            if (!isNaN(s) && s > 0) salary = s;
          } else if (item.baseSalary?.value?.minValue) {
            const s = Number(item.baseSalary.value.minValue);
            if (!isNaN(s) && s > 0) salary = s;
          }
          if (item.description && !rawDescriptionHtml) {
            rawDescriptionHtml = item.description;
          }
          if (item.employmentType) {
            const types = Array.isArray(item.employmentType)
              ? item.employmentType
              : [item.employmentType];
            types.forEach((t: string) => tags.push(htmlToCleanText(t)));
          }
        }
      }
    } catch {
      // Continue if JSON parse fails
    }
  }

  // --- 2. If description was in JSON-LD, convert to rich clean text ---
  if (rawDescriptionHtml) {
    fullCleanedDescription = htmlToCleanText(rawDescriptionHtml);
  } else {
    // Fallback: Extract from HTML body containers
    fullCleanedDescription = extractJobDescriptionFromHtml(html);
  }

  // --- 3. OpenGraph and Title Tag Fallbacks for Title / Company ---
  const ogTitleMatch = html.match(
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i
  );
  const titleTagMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const rawTitle = ogTitleMatch?.[1] || titleTagMatch?.[1] || "";
  const cleanedTitle = htmlToCleanText(rawTitle);

  const ogSiteNameMatch = html.match(
    /<meta\s+(?:property|name)=["']og:site_name["']\s+content=["'](.*?)["']/i
  );
  const siteName = ogSiteNameMatch ? htmlToCleanText(ogSiteNameMatch[1]) : "";

  // Parse title patterns
  if (!position || !company) {
    if (cleanedTitle) {
      const atMatch = cleanedTitle.match(/^(.+?)\s+(?:at|@)\s+([^-|–—]+)/i);
      if (atMatch) {
        if (!position) position = atMatch[1].trim();
        if (!company) company = atMatch[2].trim();
      }

      if (!position || !company) {
        const splitMatch = cleanedTitle.split(/\s+[-|–—]\s+/);
        if (splitMatch.length >= 2) {
          if (!position) position = splitMatch[0].trim();
          if (!company) company = splitMatch[1].trim();
        }
      }

      if (!position) {
        position = cleanedTitle.slice(0, 80);
      }
    }
  }

  // If company is still not identified
  if (!company) {
    if (
      siteName &&
      !siteName.toLowerCase().includes("jobs") &&
      !siteName.toLowerCase().includes("careers") &&
      !siteName.toLowerCase().includes("linkedin")
    ) {
      company = siteName;
    } else {
      company = extractCompanyFromUrl(url);
    }
  }

  // Clean company name of generic keywords
  company = company.replace(/\b(careers|jobs|recruitment|at|hiring)\b/gi, "").trim();
  if (!company) company = extractCompanyFromUrl(url) || "Company";

  // --- 4. Deep Section Parsing from Full Cleaned Description ---
  const responsibilities = extractBulletsUnderHeading(
    fullCleanedDescription,
    /(?:responsibilities|what you'll do|core responsibilities|key duties|the role|your impact|what to expect|tasks|what you'll be doing)/i
  );

  const requirements = extractBulletsUnderHeading(
    fullCleanedDescription,
    /(?:requirements|qualifications|what you bring|who you are|skills & experience|must haves|what we're looking for|basic qualifications|what you'll need)/i
  );

  const benefits = extractBulletsUnderHeading(
    fullCleanedDescription,
    /(?:benefits|perks|what we offer|why join us|compensation & benefits)/i
  );

  // Extract salary if not already found in JSON-LD
  if (!salary) {
    const sal = extractSalaryDetails(fullCleanedDescription);
    salary = sal.salary;
    salaryText = sal.salaryText;
  }

  // Extract recruiter contact
  const recruiterContact = extractRecruiterContact(fullCleanedDescription);

  // Remote / Hybrid detection
  if (!location) {
    if (/\bremote\b/i.test(cleanedTitle) || /\bremote\b/i.test(fullCleanedDescription.slice(0, 5000))) {
      location = "Remote";
      tags.push("Remote");
    } else if (/\bhybrid\b/i.test(cleanedTitle) || /\bhybrid\b/i.test(fullCleanedDescription.slice(0, 5000))) {
      location = "Hybrid";
      tags.push("Hybrid");
    }
  }

  // Common Tech Tags
  const commonTech = [
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Python",
    "Go",
    "Golang",
    "Java",
    "AWS",
    "SQL",
    "PostgreSQL",
    "Docker",
    "Kubernetes",
    "Full-time",
    "Internship",
    "Contract",
  ];
  for (const tech of commonTech) {
    const rx = new RegExp(`\\b${tech}\\b`, "i");
    if (rx.test(position) || rx.test(fullCleanedDescription.slice(0, 3000))) {
      if (!tags.includes(tech)) tags.push(tech);
    }
  }

  // Generate a helpful notes summary if notes is empty
  let notes = "";
  if (responsibilities.length > 0) {
    notes = `Key Focus: ${responsibilities.slice(0, 2).join("; ")}`;
  } else if (fullCleanedDescription) {
    notes = fullCleanedDescription.slice(0, 300) + "...";
  }

  return {
    company: company.slice(0, 50),
    position: (position || "Job Position").slice(0, 80),
    location: location ? location.slice(0, 50) : undefined,
    salary,
    salaryText,
    jobUrl: url,
    description: fullCleanedDescription,
    responsibilities,
    requirements,
    benefits,
    recruiterContact,
    notes,
    tags: Array.from(new Set(tags)).slice(0, 5),
  };
}
