import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { storage } from "@/lib/storage";
import { extractSkillsFromText } from "@/lib/resume-analyzer";

export async function GET() {
  try {
    const sessionData = await getSession();
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const resume = storage.getUserMasterResume(userId);

    if (!resume) {
      return NextResponse.json({
        exists: false,
        resume: null,
      });
    }

    const { categories } = extractSkillsFromText(resume.rawText);

    return NextResponse.json({
      exists: true,
      resume: {
        rawText: resume.rawText,
        parsedSkills: resume.parsedSkills || [],
        categories,
        updatedAt: resume.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/resume:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load master resume" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const body = await req.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json(
        { error: "Resume text content is required" },
        { status: 400 }
      );
    }

    // Extract skills automatically using zero-cost local NLP engine
    const { skillNames, categories } = extractSkillsFromText(rawText);

    // Save to storage
    const updated = storage.updateUserMasterResume(userId, rawText.trim(), skillNames);

    return NextResponse.json({
      success: true,
      resume: {
        rawText: updated?.rawText,
        parsedSkills: updated?.parsedSkills,
        categories,
        updatedAt: updated?.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/resume:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save master resume" },
      { status: 500 }
    );
  }
}
