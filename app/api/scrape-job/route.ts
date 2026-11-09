import { NextResponse } from "next/server";
import { parseJobFromHtml } from "@/lib/job-scraper";
import { getSession } from "@/lib/auth/auth";
import { storage } from "@/lib/storage";
import { analyzeJobFit } from "@/lib/resume-analyzer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, columnId, autoSave } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Please enter a valid web URL starting with http:// or https://" },
        { status: 400 }
      );
    }

    let html = "";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        html = await response.text();
      }
    } catch (fetchErr: any) {
      console.warn("Could not fetch remote page content:", fetchErr.message);
    }

    const jobData = parseJobFromHtml(html, parsedUrl.toString());

    // If autoSave is requested and user is authenticated, save directly to board
    if (autoSave) {
      const sessionData = await getSession();
      if (sessionData?.user?.id) {
        const userId = sessionData.user.id;
        const resume = storage.getUserMasterResume(userId);
        let fitAnalysis = undefined;

        if (resume?.rawText) {
          fitAnalysis = analyzeJobFit(resume.rawText, {
            title: jobData.position,
            description: jobData.description,
            requirements: jobData.requirements,
            responsibilities: jobData.responsibilities,
          });
        }

        const savedApp = storage.createJobApplication(userId, {
          company: jobData.company,
          position: jobData.position,
          columnId,
          location: jobData.location,
          salary: jobData.salary,
          salaryText: jobData.salaryText,
          jobUrl: jobData.jobUrl,
          tags: jobData.tags,
          notes: jobData.notes,
          description: jobData.description,
          responsibilities: jobData.responsibilities,
          requirements: jobData.requirements,
          recruiterContact: jobData.recruiterContact,
          fitAnalysis,
        });

        return NextResponse.json({
          success: true,
          application: savedApp,
        });
      }
    }

    return NextResponse.json({
      success: true,
      jobData,
    });
  } catch (error: any) {
    console.error("Error in /api/scrape-job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract job details" },
      { status: 500 }
    );
  }
}
