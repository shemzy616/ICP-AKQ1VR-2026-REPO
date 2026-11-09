import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { storage } from "@/lib/storage";
import { analyzeJobFit } from "@/lib/resume-analyzer";

export async function POST(req: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const body = await req.json();
    const { applicationId, jobData, syncAll } = body;

    const resume = storage.getUserMasterResume(userId);
    const resumeText = resume?.rawText || "";

    // Case 1: Re-analyze ALL applications for user
    if (syncAll) {
      const allApps = storage.getAllApplicationsForUser(userId);
      const updatedList = [];

      for (const app of allApps) {
        const fitAnalysis = analyzeJobFit(resumeText, {
          title: app.position,
          description: app.description,
          requirements: app.requirements,
          responsibilities: app.responsibilities,
        });

        const updated = storage.updateJobApplication(app._id, userId, {
          fitAnalysis,
        });
        if (updated) updatedList.push(updated);
      }

      return NextResponse.json({
        success: true,
        count: updatedList.length,
        updatedApplications: updatedList,
      });
    }

    // Case 2: Analyze a specific application by ID
    if (applicationId) {
      const app = storage.getJobApplicationById(applicationId, userId);
      if (!app) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      const fitAnalysis = analyzeJobFit(resumeText, {
        title: app.position,
        description: app.description,
        requirements: app.requirements,
        responsibilities: app.responsibilities,
      });

      storage.updateJobApplication(applicationId, userId, { fitAnalysis });

      return NextResponse.json({
        success: true,
        applicationId,
        fitAnalysis,
      });
    }

    // Case 3: Ad-hoc analysis from provided job data
    if (jobData) {
      const fitAnalysis = analyzeJobFit(resumeText, {
        title: jobData.title || jobData.position,
        description: jobData.description,
        requirements: jobData.requirements,
        responsibilities: jobData.responsibilities,
      });

      return NextResponse.json({
        success: true,
        fitAnalysis,
      });
    }

    return NextResponse.json(
      { error: "Please provide either applicationId, jobData, or syncAll: true" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/resume/analyze:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze job fit" },
      { status: 500 }
    );
  }
}
