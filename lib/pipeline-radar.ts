import { JobApplicationItem, ColumnItem } from "@/components/dashboard/types";

export interface ApplicationAgeStatus {
  daysElapsed: number;
  stage: "fresh" | "followup_due" | "cooling" | "ghosted" | "active_stage";
  label: string;
  subtext: string;
  pillClass: string;
  isFollowupDue: boolean;
  isGhosted: boolean;
  hasFollowedUp: boolean;
  followedUpDaysAgo: number | null;
}

export interface FollowUpTemplate {
  email: {
    subject: string;
    body: string;
  };
  linkedIn: string;
  quickCheckIn: string;
}

/**
 * Calculates real-time application age, follow-up window, and ghosting status
 */
export function getApplicationAgeStatus(app: JobApplicationItem): ApplicationAgeStatus {
  const now = Date.now();
  const baseDate = app.appliedDate || app.createdAt || now;
  const appliedTimestamp = new Date(baseDate).getTime();
  const daysElapsed = Math.max(0, Math.floor((now - appliedTimestamp) / (1000 * 60 * 60 * 24)));

  let hasFollowedUp = false;
  let followedUpDaysAgo: number | null = null;

  if (app.lastFollowedUpAt) {
    hasFollowedUp = true;
    const followUpTime = new Date(app.lastFollowedUpAt).getTime();
    followedUpDaysAgo = Math.max(0, Math.floor((now - followUpTime) / (1000 * 60 * 60 * 24)));
  }

  const normalizedStatus = (app.status || "").toLowerCase().trim();

  // If already Interviewing, Offered, or Rejected, don't label as ghosted/applied follow-up
  if (
    normalizedStatus.includes("interview") ||
    normalizedStatus.includes("offer") ||
    normalizedStatus.includes("reject")
  ) {
    return {
      daysElapsed,
      stage: "active_stage",
      label: `${daysElapsed}d in ${app.status}`,
      subtext: "Active stage",
      pillClass: "bg-zinc-100 text-zinc-600 border-zinc-200",
      isFollowupDue: false,
      isGhosted: false,
      hasFollowedUp,
      followedUpDaysAgo,
    };
  }

  // If user has already followed up recently (< 7 days ago)
  if (hasFollowedUp && followedUpDaysAgo !== null && followedUpDaysAgo < 7) {
    return {
      daysElapsed,
      stage: "cooling",
      label: followedUpDaysAgo === 0 ? "✓ Followed up today" : `✓ Followed up ${followedUpDaysAgo}d ago`,
      subtext: "Awaiting recruiter response",
      pillClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      isFollowupDue: false,
      isGhosted: false,
      hasFollowedUp: true,
      followedUpDaysAgo,
    };
  }

  // 1. GHOSTED / STALE (28+ days)
  if (daysElapsed >= 28) {
    return {
      daysElapsed,
      stage: "ghosted",
      label: `👻 ${daysElapsed}d • Likely Ghosted`,
      subtext: "Requisition likely filled or paused",
      pillClass: "bg-purple-50 text-purple-700 border-purple-200",
      isFollowupDue: false,
      isGhosted: true,
      hasFollowedUp,
      followedUpDaysAgo,
    };
  }

  // 2. PRIME FOLLOW-UP WINDOW (Days 7–14)
  if (daysElapsed >= 7 && daysElapsed <= 14) {
    return {
      daysElapsed,
      stage: "followup_due",
      label: `⚡ ${daysElapsed}d • Follow-up Due`,
      subtext: "Hiring manager screening window",
      pillClass: "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse",
      isFollowupDue: true,
      isGhosted: false,
      hasFollowedUp,
      followedUpDaysAgo,
    };
  }

  // 3. COOLING WINDOW (Days 15–27)
  if (daysElapsed > 14) {
    return {
      daysElapsed,
      stage: "cooling",
      label: `❄️ ${daysElapsed}d ago`,
      subtext: "Review period cooling",
      pillClass: "bg-zinc-100 text-zinc-600 border-zinc-200",
      isFollowupDue: false,
      isGhosted: false,
      hasFollowedUp,
      followedUpDaysAgo,
    };
  }

  // 4. FRESH (Days 0–6)
  return {
    daysElapsed,
    stage: "fresh",
    label: daysElapsed === 0 ? "⏱️ Applied Today" : `⏱️ Applied ${daysElapsed}d ago`,
    subtext: "In active initial review",
    pillClass: "bg-zinc-50 text-zinc-600 border-zinc-200/80",
    isFollowupDue: false,
    isGhosted: false,
    hasFollowedUp,
    followedUpDaysAgo,
  };
}

/**
 * Assembles tailored 1-click follow-up templates ready to paste into Gmail or LinkedIn
 */
export function generateFollowUpTemplates(
  app: JobApplicationItem,
  userName = "Applicant"
): FollowUpTemplate {
  const company = app.company || "the team";
  const position = app.position || "this role";
  const contact = app.recruiterContact || "Hiring Team";
  const appliedDateStr = app.appliedDate
    ? new Date(app.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "recently";

  const topSkills =
    app.fitAnalysis?.matchedSkills && app.fitAnalysis.matchedSkills.length > 0
      ? app.fitAnalysis.matchedSkills.slice(0, 2).join(" and ")
      : app.tags && app.tags.length > 0
      ? app.tags.slice(0, 2).join(" and ")
      : "software engineering";

  // Email template
  const emailSubject = `Following up: ${position} application – ${userName}`;
  const emailBody = `Hi ${contact},

I hope you're having a productive week!

I submitted my application for the ${position} position at ${company} ${appliedDateStr} and wanted to reiterate my strong enthusiasm for the role.

Given my background with ${topSkills}, I'm very excited about the prospect of contributing to your team's upcoming milestones. I've attached my resume again for convenience.

Please let me know if there are any additional details or work samples I can provide to support my application. Thank you for your time!

Best regards,
${userName}`;

  // LinkedIn direct message (under 300 chars)
  const linkedIn = `Hi ${contact}! I recently applied for the ${position} opening at ${company}. Given my background in ${topSkills}, I'd love to connect and follow up on the status of the search! Looking forward to connecting.`;

  // Quick casual 1-liner
  const quickCheckIn = `Hi ${contact}, quick check-in regarding the ${position} role at ${company} I applied to on ${appliedDateStr}. Still very enthusiastic—would love to know if next steps are underway!`;

  return {
    email: {
      subject: emailSubject,
      body: emailBody,
    },
    linkedIn: linkedIn.slice(0, 300),
    quickCheckIn,
  };
}

/**
 * Calculates aggregate ghosting radar & pipeline hygiene statistics
 */
export function calculatePipelineGhostingStats(columns: ColumnItem[]) {
  const allApps: JobApplicationItem[] = [];
  columns.forEach((c) => allApps.push(...(c.JobApplications || [])));

  // Exclude archived applications
  const activeApps = allApps.filter((a) => !a.isArchived);

  let followupsDueCount = 0;
  const staleApplications: JobApplicationItem[] = [];
  let ghostedCount = 0;
  let totalAppliedCount = 0;
  let totalDays = 0;

  for (const app of activeApps) {
    const ageStatus = getApplicationAgeStatus(app);

    const normStatus = (app.status || "").toLowerCase();
    const isAppliedColumn =
      normStatus === "applied" || normStatus === "wishlist" || !normStatus.includes("reject");

    if (isAppliedColumn) {
      totalAppliedCount++;
      totalDays += ageStatus.daysElapsed;

      if (ageStatus.isFollowupDue) {
        followupsDueCount++;
      }

      if (ageStatus.isGhosted) {
        ghostedCount++;
        staleApplications.push(app);
      }
    }
  }

  const ghostingRate =
    totalAppliedCount > 0 ? Math.round((ghostedCount / totalAppliedCount) * 100) : 0;
  const avgResponseDays =
    totalAppliedCount > 0 ? Math.round((totalDays / totalAppliedCount) * 10) / 10 : 0;

  return {
    totalActive: activeApps.length,
    totalApplied: totalAppliedCount,
    followupsDueCount,
    ghostedCount,
    ghostingRate,
    avgResponseDays,
    staleApplications,
  };
}
